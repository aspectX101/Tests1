'use strict';
const path = require('node:path');
const { execFile } = require('node:child_process');
const { createSafeModeMonitor } = require('./safemode-monitor.cjs');

const tweakIds = new Set(['windows.power.high', 'fivem.priority.high', 'keyboard.repeat.fast', 'keyboard.filterkeys.off', 'keyboard.stickykeys.off', 'windows.capture.off', 'windows.gamemode.on', 'windows.audio.ducking.off']);
const actions = new Set(['info', 'list', 'status', 'apply', 'revert', 'cache-info', 'cache-clean', 'cache-restore', 'cache-purge', 'safemode-scan', 'safemode-report', 'safemode-enable', 'safemode-disable', 'safemode-enforce', 'backup-list', 'backup-preview', 'backup-export', 'backup-restore', 'backup-restore-all',
  'mods-list', 'mods-import', 'mods-enable', 'mods-disable', 'mods-remove', 'res-get', 'res-set', 'res-reset']);
const modCategories = new Set(['graphics', 'sound', 'weapons', 'minimap', 'other']);

// Main-process code only. Do not give the renderer access to execFile or arbitrary paths.
function createBackendClient(app, options = {}) {
  const run = options.execFile || execFile;
  const resources = options.resourcesPath || process.resourcesPath;
  const root = app.isPackaged ? path.join(resources, 'backend') : path.resolve(__dirname, '..');
  const script = path.join(root, 'tweaker.ps1');
  const windowsRoot = options.windowsRoot || process.env.SystemRoot;
  if (!windowsRoot || !path.win32.isAbsolute(windowsRoot)) throw new Error('Windows runtime required');
  const powershell = path.win32.join(windowsRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

  const invokeBackend = function (request) {
    if (!request || typeof request !== 'object' || !actions.has(request.action)) return Promise.reject(new Error('invalid_action'));
    const { action, id, lang = 'de', fiveMPath, backupId, confirmPurge = false, modId, modPath, category, name, width, height, windowed } = request;
    if (!['de', 'en', 'it'].includes(lang)) return Promise.reject(new Error('invalid_language'));
    if (['status', 'apply', 'revert'].includes(action) && !tweakIds.has(id)) return Promise.reject(new Error('invalid_tweak_id'));
    const args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-Action', action, '-Lang', lang];
    if (['status', 'apply', 'revert'].includes(action)) args.push('-Id', id);
    // Mod Manager (ModManager.ps1): nur feste Felder, Pfade nur lokal-absolut (kommen aus dem Datei-Dialog im Hauptprozess)
    if (action.startsWith('mods-') || action.startsWith('res-')) {
      if (['mods-enable', 'mods-disable', 'mods-remove'].includes(action)) {
        if (typeof modId !== 'string' || !/^[a-f0-9]{12}$/.test(modId)) return Promise.reject(new Error('invalid_mod_id'));
        args.push('-ModId', modId);
      }
      if (action === 'mods-import') {
        if (typeof modPath !== 'string' || !path.win32.isAbsolute(modPath) || /[\x00-\x1f]/.test(modPath) || modPath.startsWith('\\\\')) return Promise.reject(new Error('mod_source_not_found'));
        if (!modCategories.has(category)) return Promise.reject(new Error('invalid_mod_category'));
        args.push('-ModPath', modPath, '-Category', category);
        if (name !== undefined) {
          if (typeof name !== 'string' || name.length > 60 || /[\x00-\x1f]/.test(name)) return Promise.reject(new Error('invalid_mod_name'));
          if (name.trim()) args.push('-Name', name.trim());
        }
      }
      if (action === 'res-set') {
        const ok = Number.isInteger(width) && Number.isInteger(height) && width >= 640 && width <= 7680 && height >= 480 && height <= 4320 && [0, 1, 2].includes(windowed);
        if (!ok) return Promise.reject(new Error('invalid_resolution'));
        args.push('-Width', String(width), '-Height', String(height), '-Windowed', String(windowed));
      }
    }
    if (action.startsWith('cache-') || action.startsWith('backup-')) {
      if (fiveMPath !== undefined) {
        if (typeof fiveMPath !== 'string' || !path.win32.isAbsolute(fiveMPath) || /[\x00-\x1f]/.test(fiveMPath) || fiveMPath.startsWith('\\\\')) return Promise.reject(new Error('invalid_fivem_path'));
        args.push('-FiveMPath', fiveMPath);
      }
      if (['cache-restore', 'cache-purge', 'backup-preview', 'backup-export', 'backup-restore'].includes(action)) {
        if (typeof backupId !== 'string' || !/^[a-f0-9]{32}$/.test(backupId)) return Promise.reject(new Error('invalid_backup_id'));
        args.push('-BackupId', backupId);
      }
      if (action === 'cache-purge') {
        if (confirmPurge !== true) return Promise.reject(new Error('explicit_purge_confirmation_required'));
        args.push('-ConfirmPurge');
      }
    }
    return new Promise((resolve, reject) => {
      // Große Mod-Packs (mehrere GB entpacken/kopieren) brauchen länger als die übrigen Aktionen.
      const timeout = ['mods-import', 'mods-enable', 'mods-disable', 'mods-remove'].includes(action) ? 3600000 : 600000;
      run(powershell, args, { windowsHide: true, shell: false, encoding: 'utf8', timeout, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
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
  // A real Electron app automatically resumes monitoring at startup. Minimal test
  // app objects without lifecycle APIs can still use this client directly.
  if (typeof app.whenReady === 'function' && typeof app.once === 'function') {
    const monitor = createSafeModeMonitor(invokeBackend, {
      onReport: options.onSafeModeReport,
      onError: options.onSafeModeError,
      getLanguage: options.getLanguage
    });
    let quitting = false;
    app.once('before-quit', () => { quitting = true; monitor.stop(); });
    void app.whenReady().then(() => { if (!quitting) return monitor.start(); }).catch(error => {
      if (options.onSafeModeError) { try { options.onSafeModeError(error); } catch { /* UI callback is isolated. */ } }
    });
  }
  return invokeBackend;
}

module.exports = { createBackendClient };

