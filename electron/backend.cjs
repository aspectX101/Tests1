'use strict';
const path = require('node:path');
const { execFile } = require('node:child_process');

const tweakIds = new Set(['windows.power.high', 'fivem.priority.high', 'keyboard.repeat.fast', 'keyboard.filterkeys.off', 'keyboard.stickykeys.off']);
const actions = new Set(['info', 'list', 'status', 'apply', 'revert', 'cache-info', 'cache-clean', 'cache-restore', 'cache-purge']);

// Main-process code only. Do not give the renderer access to execFile or arbitrary paths.
function createBackendClient(app, options = {}) {
  const run = options.execFile || execFile;
  const resources = options.resourcesPath || process.resourcesPath;
  const root = app.isPackaged ? path.join(resources, 'backend') : path.resolve(__dirname, '..');
  const script = path.join(root, 'tweaker.ps1');
  const windowsRoot = options.windowsRoot || process.env.SystemRoot;
  if (!windowsRoot || !path.win32.isAbsolute(windowsRoot)) throw new Error('Windows runtime required');
  const powershell = path.win32.join(windowsRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

  return function invokeBackend(request) {
    if (!request || typeof request !== 'object' || !actions.has(request.action)) return Promise.reject(new Error('invalid_action'));
    const { action, id, lang = 'de', fiveMPath, backupId, confirmPurge = false } = request;
    if (!['de', 'en', 'it'].includes(lang)) return Promise.reject(new Error('invalid_language'));
    if (['status', 'apply', 'revert'].includes(action) && !tweakIds.has(id)) return Promise.reject(new Error('invalid_tweak_id'));
    const args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-Action', action, '-Lang', lang];
    if (['status', 'apply', 'revert'].includes(action)) args.push('-Id', id);
    if (action.startsWith('cache-')) {
      if (fiveMPath !== undefined) {
        if (typeof fiveMPath !== 'string' || !path.win32.isAbsolute(fiveMPath) || /[\x00-\x1f]/.test(fiveMPath) || fiveMPath.startsWith('\\\\')) return Promise.reject(new Error('invalid_fivem_path'));
        args.push('-FiveMPath', fiveMPath);
      }
      if (['cache-restore', 'cache-purge'].includes(action)) {
        if (typeof backupId !== 'string' || !/^[a-f0-9]{32}$/.test(backupId)) return Promise.reject(new Error('invalid_backup_id'));
        args.push('-BackupId', backupId);
      }
      if (action === 'cache-purge') {
        if (confirmPurge !== true) return Promise.reject(new Error('explicit_purge_confirmation_required'));
        args.push('-ConfirmPurge');
      }
    }
    return new Promise((resolve, reject) => {
      run(powershell, args, { windowsHide: true, shell: false, encoding: 'utf8', timeout: 600000, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
        // Valid backend errors use exit 1 AND a JSON object. Preserve them for the UI.
        if (error && error.code !== 1) return reject(new Error(error.killed ? 'backend_timeout_or_terminated' : 'backend_process_failed'));
        let result;
        try { result = JSON.parse(String(stdout).replace(/^\uFEFF/, '')); }
        catch { return reject(new Error('invalid_backend_json')); }
        if (!result || Array.isArray(result) || typeof result !== 'object' || typeof result.ok !== 'boolean') return reject(new Error('invalid_backend_response'));
        if ((error && result.ok) || (!error && !result.ok)) return reject(new Error('backend_exit_mismatch'));
        if (stderr && String(stderr).trim()) return reject(new Error('unexpected_backend_stderr'));
        resolve(result);
      });
    });
  };
}

module.exports = { createBackendClient };
