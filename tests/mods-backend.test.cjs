'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createBackendClient } = require('../electron/backend.cjs');

function client(onExec) {
  return createBackendClient({ isPackaged: true }, {
    resourcesPath: 'C:\\Program Files\\Tweaker\\resources', windowsRoot: 'C:\\Windows',
    execFile: (exe, args, options, done) => { onExec(args); done(null, '{"ok":true}', ''); },
  });
}
const argAfter = (args, name) => args[args.indexOf(name) + 1];

test('mods-import passes path, category and trimmed name', async () => {
  let seen;
  await client((a) => { seen = a; })({ action: 'mods-import', modPath: 'C:\\Users\\x\\Downloads\\nve.zip', category: 'graphics', name: '  NVE  ' });
  assert.equal(argAfter(seen, '-ModPath'), 'C:\\Users\\x\\Downloads\\nve.zip');
  assert.equal(argAfter(seen, '-Category'), 'graphics');
  assert.equal(argAfter(seen, '-Name'), 'NVE');
});

test('mods-import rejects relative, UNC and control-character paths and unknown categories', async () => {
  const c = client(() => assert.fail('must not execute'));
  await assert.rejects(c({ action: 'mods-import', modPath: 'nve.zip', category: 'graphics' }), /mod_source_not_found/);
  await assert.rejects(c({ action: 'mods-import', modPath: '\\\\server\\share\\nve.zip', category: 'graphics' }), /mod_source_not_found/);
  await assert.rejects(c({ action: 'mods-import', modPath: 'C:\\a\nb.zip', category: 'graphics' }), /mod_source_not_found/);
  await assert.rejects(c({ action: 'mods-import', modPath: 'C:\\a.zip', category: 'cheats' }), /invalid_mod_category/);
});

test('mod ids and resolutions are validated', async () => {
  const c = client(() => assert.fail('must not execute'));
  await assert.rejects(c({ action: 'mods-enable', modId: '../../x' }), /invalid_mod_id/);
  await assert.rejects(c({ action: 'res-set', width: 100, height: 1080, windowed: 0 }), /invalid_resolution/);
  await assert.rejects(c({ action: 'res-set', width: 1920, height: 1080, windowed: 5 }), /invalid_resolution/);
  let seen;
  await client((a) => { seen = a; })({ action: 'res-set', width: 1440, height: 1080, windowed: 2 });
  assert.deepEqual([argAfter(seen, '-Width'), argAfter(seen, '-Height'), argAfter(seen, '-Windowed')], ['1440', '1080', '2']);
});
