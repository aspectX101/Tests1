#!/usr/bin/env node
// Renders the H1T.CC Discord assets with Chromium (playwright):
//   assets/emojis/<name>.png   128×128 emojis from design/emojis.json (dark glass, chrome rim, white icon, accent glow)
//   assets/banner.png          1500×600 rules banner
//   assets/preview.png         a mock of the posted message, to check the look without Discord
// Usage: npm run design   (needs playwright; uses the bundled fonts and the H1T logo in design/)
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const design = path.join(root, 'design');
const out = path.join(root, 'assets');
const b64 = (file) => fs.readFileSync(path.join(design, file)).toString('base64');
const FONTS = `
  @font-face { font-family: 'Inter Tight'; font-weight: 700; src: url(data:font/woff2;base64,${b64('inter-tight-latin-700-normal.woff2')}) format('woff2'); }
  @font-face { font-family: 'Inter Tight'; font-weight: 800; src: url(data:font/woff2;base64,${b64('inter-tight-latin-800-normal.woff2')}) format('woff2'); }
  @font-face { font-family: 'JetBrains Mono'; font-weight: 500; src: url(data:font/woff2;base64,${b64('jetbrains-mono-latin-500-normal.woff2')}) format('woff2'); }`;
const LOGO = `data:image/png;base64,${b64('h1t-logo-main.png')}`;

// Lucide SVG → inner markup (paths), re-coloured and re-stroked by the page
const icon = (name) => fs.readFileSync(path.join(design, 'icons', `${name}.svg`), 'utf8')
  .replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

function emojiHtml({ icon: name, accent }) {
  const glyph = name === 'logo'
    ? `<img src="${LOGO}" style="position:absolute;left:14px;top:38px;width:100px;height:48px;object-fit:contain;filter:drop-shadow(0 2px 3px rgba(0,0,0,.6))">`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"
         style="position:absolute;left:32px;top:32px;width:64px;height:64px;filter:drop-shadow(0 0 6px ${accent}) drop-shadow(0 2px 2px rgba(0,0,0,.6))">${icon(name)}</svg>`;
  return `<!doctype html><html><head><style>html,body{margin:0;background:transparent}
    .e{position:relative;width:128px;height:128px}
    .disc{position:absolute;inset:4px;border-radius:50%;
      background:radial-gradient(circle at 50% 118%, ${accent}66 0%, transparent 55%),radial-gradient(circle at 50% 35%, #2b2b30 0%, #121214 55%, #050505 100%);
      box-shadow:inset 0 0 0 3px #0a0a0b, inset 0 -6px 16px ${accent}40}
    .rim{position:absolute;inset:4px;border-radius:50%;padding:3px;background:conic-gradient(from 210deg,#f4f4f5,#71717a,#e4e4e7,#52525b,#fafafa,#71717a,#f4f4f5);
      -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor}
    .gloss{position:absolute;left:22px;top:12px;width:84px;height:44px;border-radius:50%;background:linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,0))}
  </style></head><body><div class="e"><div class="disc"></div>${glyph}<div class="gloss"></div><div class="rim"></div></div></body></html>`;
}

function bannerHtml() {
  return `<!doctype html><html><head><style>${FONTS}
    html,body{margin:0;background:#050505}
    .b{position:relative;width:1500px;height:600px;overflow:hidden;font-family:'Inter Tight',sans-serif;
      background:radial-gradient(ellipse 60% 80% at 30% 50%,#1a1a1d 0%,#0a0a0b 55%,#050505 100%)}
    .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:48px 48px;
      -webkit-mask:radial-gradient(ellipse 70% 90% at 40% 50%,#000 30%,transparent 80%)}
    .streak{position:absolute;height:2px;background:linear-gradient(90deg,transparent,#fff,transparent);box-shadow:0 0 18px 3px rgba(255,255,255,.35);transform:rotate(-14deg)}
    .bar{position:absolute;left:70px;top:46px;width:420px;height:14px;background:repeating-linear-gradient(-55deg,#e4e4e7 0 10px,transparent 10px 20px);opacity:.85}
    .logo{position:absolute;left:70px;top:150px;width:470px;filter:drop-shadow(0 18px 40px rgba(0,0,0,.8))}
    .label{position:absolute;left:640px;top:150px;font:500 22px 'JetBrains Mono',monospace;letter-spacing:.45em;color:#a1a1aa}
    .title{position:absolute;left:632px;top:182px;font-weight:800;font-size:200px;line-height:1;letter-spacing:-.04em;
      background:linear-gradient(180deg,#fff 0%,#e4e4e7 45%,#8a8a92 100%);-webkit-background-clip:text;color:transparent;filter:drop-shadow(0 10px 30px rgba(0,0,0,.7))}
    .rule{position:absolute;left:640px;top:420px;width:520px;height:2px;background:linear-gradient(90deg,rgba(255,255,255,.85),transparent)}
    .sub{position:absolute;left:640px;top:446px;font:500 22px 'JetBrains Mono',monospace;letter-spacing:.32em;color:#d4d4d8}
    .pill{position:absolute;left:70px;bottom:52px;display:flex;align-items:center;gap:14px;padding:10px 22px;border-radius:999px;border:1px solid rgba(255,255,255,.22);
      background:rgba(255,255,255,.04);font:500 20px 'JetBrains Mono',monospace;letter-spacing:.18em;color:#fafafa}
    .pill i{width:10px;height:10px;border-radius:50%;background:#34d399;box-shadow:0 0 12px #34d399}
    .scale{position:absolute;right:-40px;top:110px;width:360px;height:360px;opacity:.11}
  </style></head><body><div class="b">
    <div class="grid"></div>
    <div class="streak" style="left:520px;top:110px;width:520px"></div>
    <div class="streak" style="left:900px;top:520px;width:640px;opacity:.6"></div>
    <div class="bar"></div>
    <svg class="scale" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${icon('scale')}</svg>
    <img class="logo" src="${LOGO}">
    <div class="label">H1T.CC · SERVER</div>
    <div class="title">RULES</div>
    <div class="rule"></div>
    <div class="sub">READ · VERIFY · UNLOCK</div>
    <div class="pill"><i></i>VERIFY TO UNLOCK</div>
  </div></body></html>`;
}

// Discord-like mock of the message (dark theme) using the rendered banner and emojis.
function previewHtml(config) {
  const img = (f) => `data:image/png;base64,${fs.readFileSync(path.join(out, f)).toString('base64')}`;
  const emo = (name) => (name ? `<img class="emo" src="${img(`emojis/${name}.png`)}">` : '');
  const md = (s) => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[(.+?)\]\((.+?)\)/g, '<a>$1</a>');
  const rules = config.rules.map((r, i) => `<div class="rule"><div class="rt">${emo(r.emoji)} ${i + 1}. ${md(r.title)}</div><div class="rb">${md(r.text)}</div></div>`).join('');
  const buttons = [config.verify, ...config.links].map((b) => `<div class="btn${b.url ? ' link' : ''}">${emo(b.emoji)}${b.label}${b.url ? '<span class="ext">↗</span>' : ''}</div>`).join('');
  return `<!doctype html><html><head><style>
    html,body{margin:0;background:#313338;font-family:'gg sans','Segoe UI','Noto Sans',sans-serif;color:#dbdee1}
    .card{width:620px;margin:20px;background:#2b2d31;border-radius:8px;border-left:4px solid ${config.accentColor};padding:16px 16px 14px}
    .banner{width:100%;border-radius:6px;display:block}
    h1{font-size:24px;color:#f2f3f5;margin:14px 0 6px;display:flex;align-items:center;gap:8px} h1 .emo{width:30px;height:30px}
    .intro{font-size:14.5px;line-height:1.45;margin:0 0 4px} .intro b{color:#f2f3f5}
    .rule{margin:12px 0}.rt{font-weight:700;color:#f2f3f5;font-size:17px;display:flex;align-items:center;gap:7px}
    .rb{border-left:4px solid #4e5058;padding:2px 0 2px 12px;margin:6px 0 0 0;font-size:14.5px;line-height:1.45}
    .rb b{color:#f2f3f5} a{color:#00a8fc}
    .emo{width:22px;height:22px;vertical-align:middle}
    hr{border:0;border-top:1px solid #3f4147;margin:14px 0}
    .btns{display:flex;gap:8px;flex-wrap:wrap}
    .btn{display:flex;align-items:center;gap:8px;background:#4e5058;color:#fff;font-weight:600;font-size:14px;padding:7px 14px;border-radius:8px}
    .btn.link{background:#4e5058}.btn:first-child{background:${config.verify.style === 'success' ? '#248046' : '#4e5058'}}
    .ext{opacity:.8;margin-left:2px}
    .foot{color:#949ba4;font-size:12px;margin-top:10px}
  </style></head><body><div class="card"><img class="banner" src="${img('banner.png')}"><h1>${emo('h1t_rules')} ${config.title}</h1>${config.intro ? `<p class="intro">${md(config.intro)}</p>` : ''}<hr>${rules}<hr><div class="btns">${buttons}</div>
    ${config.footer ? `<div class="foot">${config.footer}</div>` : ''}</div></body></html>`;
}

(async () => {
  const { emojis } = JSON.parse(fs.readFileSync(path.join(design, 'emojis.json'), 'utf8'));
  fs.mkdirSync(path.join(out, 'emojis'), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 128, height: 128 } });
  for (const e of emojis) {
    await page.setContent(emojiHtml(e));
    await page.waitForTimeout(50);
    await page.screenshot({ path: path.join(out, 'emojis', `${e.name}.png`), omitBackground: true });
  }
  console.log(`Emojis: ${emojis.length} → assets/emojis/`);
  await page.setViewportSize({ width: 1500, height: 600 });
  await page.setContent(bannerHtml());
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(out, 'banner.png') });
  console.log('Banner: assets/banner.png');
  const config = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
  await page.setViewportSize({ width: 680, height: 400 });
  await page.setContent(previewHtml(config));
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(out, 'preview.png'), fullPage: true });
  console.log('Preview: assets/preview.png');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
