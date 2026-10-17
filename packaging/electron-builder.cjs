'use strict';
const path = require('node:path');

// Run from Claude's Electron project directory, where package.json/main/UI exist.
// No UI implementation is supplied or replaced by this configuration.
module.exports = {
  appId: 'com.tweaker.desktop',
  productName: 'Tweaker',
  asar: true,
  artifactName: 'Tweaker-${version}-${arch}.exe',
  win: {
    target: [{ target: 'portable', arch: ['x64'] }],
    requestedExecutionLevel: 'requireAdministrator'
  },
  extraResources: [{
    from: path.resolve(__dirname, '..'),
    to: 'backend',
    filter: ['tweaker.ps1', 'Tweaker.psm1', 'Keyboard.ps1', 'CacheCleaner.ps1', 'SafeMode.ps1', 'Backup.ps1', 'native/Keyboard.cs', 'electron/backend.cjs', 'electron/safemode-monitor.cjs']
  }]
};
