#!/usr/bin/env node
/**
 * contrast_ui.mjs —— 真实渲染的文本对比度检查（元素级）
 * 用法: node contrast_ui.mjs --url <url|file://...> [--dark] [--out contrast.md]
 * 为什么需要它：静态审查只看"同一条规则里的 color/background"，
 * 而文字色与背景常来自不同规则、不同元素 —— 只有渲染后才看得见。
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const n = argv[i + 1]; if (n === undefined || n.startsWith('--')) out[k] = true; else { out[k] = n; i++; } }
  }
  return out;
}
async function loadPlaywright() {
  try { return await import('playwright'); } catch { /* next */ }
  try { const req = createRequire(process.cwd() + '/'); return req('playwright'); } catch { return null; }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url) { console.error('用法: node contrast_ui.mjs --url <url|file://...> [--dark] [--out report.md]'); process.exit(2); }
  const pw = await loadPlaywright();
  if (!pw) { console.error('未检测到 playwright：npm i -D playwright && npx playwright install chromium'); process.exit(2); }
  const browser = await pw.chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  if (args.dark) await context.addInitScript(function () { try { localStorage.setItem('ca-theme-mode', 'dark'); } catch (e) {} });
  const page = await context.newPage();
  await page.goto(String(args.url), { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(700);
  await page.evaluate(async function () {
    var step = Math.round(window.innerHeight * 0.8);
    for (var y = 0; y < document.body.scrollHeight; y += step) { window.scrollTo(0, y); await new Promise(function (r) { setTimeout(r, 60); }); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);

  const results = await page.evaluate(function () {
    function parseRGB(c) {
      if (!c) return null;
      let m = String(c).match(/^rgba?\(([^)]+)\)/i);
      if (m) {
        const p = m[1].split(/[,\s\/]+/).filter(Boolean).map(Number);
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
      }
      m = String(c).match(/^color\(\s*(?:srgb|display-p3)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/i);
      if (m) {
        const s = Math.max(+m[1], +m[2], +m[3]) <= 1 ? 255 : 1;   // 0-1 与 0-255 两种写法
        return { r: +m[1] * s, g: +m[2] * s, b: +m[3] * s, a: m[4] !== undefined ? +m[4] : 1 };
      }
      return null;
    }
    function lum(c) {
      const v = [c.r, c.g, c.b].map(function (x) { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    }
    function ratio(a, b) {
      const la = lum(a), lb = lum(b);
      const hi = Math.max(la, lb), lo = Math.min(la, lb);
      return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
    }
    function over(top, bottom) {   // 把 top 合成到 bottom 上
      const a = top.a;
      return { r: top.r * a + bottom.r * (1 - a), g: top.g * a + bottom.g * (1 - a), b: top.b * a + bottom.b * (1 - a), a: 1 };
    }
    function effectiveBg(el) {
      const stack = []; let node = el, guard = 0, hasImage = false;
      while (node && guard++ < 60) {
        const cs = getComputedStyle(node);
        if (cs.backgroundImage && cs.backgroundImage !== 'none') hasImage = true;
        const c = parseRGB(cs.backgroundColor);
        if (c && c.a > 0.001) { stack.push(c); if (c.a >= 0.999) break; }
        node = node.parentElement;
      }
      let base = { r: 255, g: 255, b: 255, a: 1 };
      for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base);
      return { rgb: base, hasImage: hasImage };
    }
    function path(el) {
      const parts = []; let n = el, d = 0;
      while (n && n.tagName && d++ < 4) {
        let s = n.tagName.toLowerCase();
        const cls = (n.getAttribute('class') || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.');
        if (cls) s += '.' + cls;
        parts.unshift(s); n = n.parentElement;
      }
      return parts.join(' > ');
    }
    const out = [];
    document.querySelectorAll('body *').forEach(function (el) {
      if (el.closest('svg')) return;
      if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) return;
      const hasOwnText = [...el.childNodes].some(function (n) { return n.nodeType === 3 && n.textContent.trim().length > 1; });
      if (!hasOwnText) return;
      const txt = (el.textContent || '').trim();
      if (txt.length < 2) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const fg = parseRGB(cs.color);
      if (!fg || fg.a < 0.05) return;
      const bg = effectiveBg(el);
      const composed = fg.a < 0.999 ? over(fg, bg.rgb) : fg;
      const size = parseFloat(cs.fontSize);
      const weight = Number(cs.fontWeight) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const need = large ? 3 : 4.5;
      const cr = ratio(composed, bg.rgb);
      if (cr < need) out.push({ selector: path(el), text: txt.slice(0, 40), ratio: cr, need: need, color: cs.color, bg: 'rgb(' + [bg.rgb.r, bg.rgb.g, bg.rgb.b].map(Math.round).join(', ') + ')', bgImage: bg.hasImage, size: Math.round(size), weight: weight });
    });
    return out;
  });
  await browser.close();

  const lines = ['# 真实渲染对比度检查', '', '- 目标: ' + args.url, '- 主题: ' + (args.dark ? '深色' : '浅色'), '- 不达标元素: ' + results.length, ''];
  if (results.length) {
    lines.push('| 位置 | 文本 | 实测 | 要求 | 文字色 | 有效背景 |', '|---|---|---|---|---|---|');
    results.forEach(function (r) { lines.push('| ' + r.selector + ' | ' + String(r.text).replace(/\|/g, '\\|') + ' | ' + r.ratio + ':1 | ' + r.need + ':1 | ' + r.color + ' | ' + r.bg + (r.bgImage ? ' ⚠纹理底' : '') + ' |'); });
  } else lines.push('未发现不达标的文本对比度。');
  if (args.out) fs.writeFileSync(String(args.out), lines.join('\n'), 'utf8');
  console.log(JSON.stringify({ url: args.url, dark: !!args.dark, failures: results.length, byText: results.slice(0, 10).map(function (r) { return r.selector + ' ' + r.ratio + ':1 "' + r.text.slice(0, 18) + '"'; }) }, null, 1));
  if (results.length) process.exitCode = 1;
}
main().catch(function (e) { console.error('检查失败: ' + e.message); process.exit(1); });
