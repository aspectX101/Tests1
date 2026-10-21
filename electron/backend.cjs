'use strict';
const path = require('node:path');
const { execFile } = require('node:child_process');
const { createSafeModeMonitor } = require('./safemode-monitor.cjs');

const tweakIds = new Set(["windows.power.profile", "windows.cpu.unpark", "windows.sync.off", "windows.explorer.startup", "windows.menu.instant", "windows.hibernate.off", "windows.gpu.tdr", "windows.mmcss.games", "windows.mmcss.latency", "windows.foreground", "windows.prefetch.off", "windows.service.sysmain.off", "windows.service.diagtrack.off", "windows.service.wappush.off", "windows.service.wer.off", "windows.service.diagnosticshub.off", "windows.service.xbgm.off", "windows.svchost.group", "windows.ceip.off", "windows.power.extras", "windows.office.telemetry.off", "windows.suggestions.off", "windows.legacy.fps", "windows.io.realtime", "windows.close.faster", "windows.mmcss.on", "windows.assistance.off", "windows.autoplay.off", "windows.tooltip.fast", "windows.activity.off", "windows.storage.off", "windows.explorer.defaults", "windows.spotlight.off", "windows.gamebar.quiet", "windows.clipboard.off", "windows.copilot.off", "windows.ink.off", "windows.capture.off", "windows.gamemode.on", "windows.audio.ducking.off", "windows.power.high", "fivem.priority.high", "keyboard.repeat.fast", "keyboard.filterkeys.off", "keyboard.stickykeys.off", "hitreg.nic.latency", "hitreg.timer.global", "hitreg.qos.fivem", "hitreg.input.power", "hitreg.fivem.priority", "keyboard.togglekeys.off", "keyboard.mousekeys.off", "keyboard.mouse.accel.off", "keyboard.mouse.speed.native", "keyboard.buffer.large", "debloat.widgets.hide", "debloat.onedrive.block", "debloat.recall.off", "debloat.suggestions.off", "network.winsock.udp", "network.throttle.off", "network.dns.fast", "network.nagle.off", "network.wifisense.off", "network.nic.powersave.off", "network.tcp.gaming", "network.teredo.off", "network.delivery.off", "network.qos.reserve.off", "network.llmnr.off", "network.lanman.lan"]);
const appIdsAllowed = new Set(require('../DebloatApps.json').map(a => a.id));
const actions = new Set(['system-check','debloat-list','debloat-preview','debloat-remove','startup-list','startup-disable','startup-restore','info', 'list', 'status', 'apply', 'revert', 'cache-info', 'cache-clean', 'cache-restore', 'cache-purge', 'safemode-scan', 'safemode-report', 'safemode-enable', 'safemode-disable', 'safemode-enforce', 'backup-list', 'backup-preview', 'backup-export', 'backup-restore', 'backup-restore-all',
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
    const { action, id, lang = 'de', fiveMPath, backupId, confirmPurge = false, modId, modPath, category, name, width, height, windowed, appIds, previewToken, confirmDataLoss = false } = request;
    if (!['de', 'en', 'it'].includes(lang)) return Promise.reject(new Error('invalid_language'));
    if (['status', 'apply', 'revert'].includes(action) && !tweakIds.has(id)) return Promise.reject(new Error('invalid_tweak_id'));
    const args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-Action', action, '-Lang', lang];
    if (['status', 'apply', 'revert'].includes(action)) args.push('-Id', id);
    if (['debloat-preview', 'debloat-remove'].includes(action)) {
      if (!Array.isArray(appIds) || !appIds.length || appIds.length > 24 || new Set(appIds).size !== appIds.length || appIds.some(x => !appIdsAllowed.has(x))) return Promise.reject(new Error('invalid_debloat_selection'));
      args.push('-AppIds', appIds.join(','));
    }
    if (['startup-disable','startup-restore'].includes(action)) {
      if (typeof id !== 'string' || !/^[a-f0-9]{32}$/.test(id)) return Promise.reject(new Error('invalid_startup_entry'));
      args.push('-Id',id);
    }
    if (['debloat-remove','startup-disable'].includes(action)) {
      if (typeof previewToken !== 'string' || !/^[a-f0-9]{64}$/.test(previewToken)) return Promise.reject(new Error('debloat_preview_changed'));
      args.push('-PreviewToken',previewToken);
    }
    if (action === 'debloat-remove' || (action === 'apply' && id === 'debloat.recall.off')) {
      if (confirmDataLoss !== true) return Promise.reject(new Error('explicit_debloat_confirmation_required'));
      args.push('-ConfirmDataLoss');
    }
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

