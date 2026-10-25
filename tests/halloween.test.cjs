'use strict';
// Halloween mode: on by default only during the season, the user's switch counts for that year's season.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '..', 'app/renderer/halloween.js'), 'utf8');

function boot(iso, stored) {
  const RealDate = Date;
  class FakeDate extends RealDate { constructor(...a) { super(...(a.length ? a : [iso])); } static now() { return new RealDate(iso).getTime(); } }
  const store = new Map(stored ? [['h1tHalloween', JSON.stringify(stored)]] : []);
  const classes = new Set();
  const el = () => ({ className: '', innerHTML: '', style: { setProperty() {} }, setAttribute() {}, append() {}, prepend() {}, querySelector: () => null, querySelectorAll: () => [], classList: { toggle() {}, add() {}, remove() {} } });
  const listeners = [];
  const document = {
    documentElement: { lang: 'de', style: { setProperty() {} } },
    body: { classList: { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) }, prepend() {}, append() {} },
    createElement: el, querySelector: () => null, getElementById: () => null,
    addEventListener: (type, fn, capture) => listeners.push({ type, fn, capture }), hidden: false,
  };
  const window = { matchMedia: () => ({ matches: false }) };
  const ctx = { window, document, Date: FakeDate, localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) },
    MutationObserver: class { observe() {} }, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, requestAnimationFrame: () => 0, innerWidth: 1280, innerHeight: 800, Math, JSON };
  vm.runInNewContext(code, ctx);
  return { hw: window.H1tHalloween, on: () => classes.has('halloween'), store, listeners };
}

test('season runs from 15 October to 1 November', () => {
  const { hw } = boot('2026-10-24T12:00:00');
  for (const [d, exp] of [['2026-10-14T23:00:00', false], ['2026-10-15T00:30:00', true], ['2026-10-31T20:00:00', true], ['2026-11-01T22:00:00', true], ['2026-11-02T08:00:00', false], ['2026-07-01T12:00:00', false]])
    assert.equal(hw.inSeason(new Date(d)), exp, d);
});

test('Halloween is on by default in season and off outside', () => {
  assert.equal(boot('2026-10-24T12:00:00').on(), true);
  assert.equal(boot('2026-12-03T12:00:00').on(), false);
});

test('switching off holds for this season only', () => {
  assert.equal(boot('2026-10-28T12:00:00', { year: 2026, on: false }).on(), false);
  assert.equal(boot('2027-10-20T12:00:00', { year: 2026, on: false }).on(), true);
});

test('in season the title-bar button is taken over in the capture phase', () => {
  const { listeners } = boot('2026-10-24T12:00:00');
  assert.ok(listeners.some((l) => l.type === 'click' && l.capture === true));
});

test('the boot animation is chosen before the first paint: Halloween in season, the gunshot reveal otherwise', () => {
  const head = fs.readFileSync(path.join(__dirname, '..', 'app/renderer/halloween-boot-head.js'), 'utf8');
  const run = (iso, stored) => {
    const RealDate = Date;
    class FakeDate extends RealDate { constructor(...a) { super(...(a.length ? a : [iso])); } }
    const classes = new Set(), window = { matchMedia: () => ({ matches: false }) };
    vm.runInNewContext(head, { window, Date: FakeDate, JSON, localStorage: { getItem: () => (stored ? JSON.stringify(stored) : null) },
      document: { documentElement: { classList: { add: (c) => classes.add(c) } } } });
    return { boot: classes.has('hw-boot'), gun: classes.has('gun-boot'), ms: window.H1T_BOOT_MS };
  };
  assert.equal(JSON.stringify(run('2026-10-24T12:00:00')), JSON.stringify({ boot: true, gun: false, ms: 8000 }));
  assert.equal(JSON.stringify(run('2026-10-24T12:00:00', { year: 2026, on: false })), JSON.stringify({ boot: false, gun: true, ms: 8000 }));
  assert.equal(JSON.stringify(run('2026-12-24T12:00:00')), JSON.stringify({ boot: false, gun: true, ms: 8000 }));
  const index = fs.readFileSync(path.join(__dirname, '..', 'app/renderer/index.html'), 'utf8');
  assert.ok(index.indexOf('halloween-boot-head.js') < index.indexOf('<body'), 'head script runs before the splash is painted');
  assert.ok(index.indexOf('glock-boot.js') > 0 && index.indexOf('glock-boot.js') < index.indexOf('app.js'), 'gunshot boot loads before app.js');
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'app/renderer/assets/halloween-pumpkin.jpg')));
});
