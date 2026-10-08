#!/usr/bin/env node
/**
 * shoot.mjs —— 多断点截图 + 溢出与报错检查
 * 用法: node shoot.mjs --url http://localhost:5173 --out shots --label before [--dark]
 * 依赖: playwright（可选）。未安装时会给出安装提示并以退出码 2 结束。
 *      npm i -D playwright && npx playwright install chromium
 */
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const n = argv[i + 1]; if (n === undefined || n.startsWith('--')) out[k] = true; else { out[k] = n; i++; } }
  }
  return out;
}

async function loadPlaywright() {
  try { return await import('playwright'); }
  catch { /* 继续尝试从当前工作目录解析 */ }
  try {
    const { createRequire } = await import('node:module');
    const req = createRequire(process.cwd() + '/');
    return req('playwright');
  } catch { /* 继续 */ }
  try { return await import('playwright-core'); }
  catch { return null; }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = args.url ? String(args.url) : null;
  if (!url) { console.error('用法: node shoot.mjs --url <url> [--out shots] [--label before] [--dark]'); process.exit(2); }
  const outDir = String(args.out || 'shots');
  const label = String(args.label || 'shot');
  const widths = String(args.widths || '360,768,1280,1536').split(',').map(function (w) { return parseInt(w, 10); }).filter(Boolean);
  const fullPage = (args.viewport || args.scroll) ? false : true;   // 指定滚动位置时只拍视口

  const pw = await loadPlaywright();
  if (!pw) {
    console.error('未检测到 playwright。安装：npm i -D playwright && npx playwright install chromium');
    console.error('（如果需要更轻量，也可用 vercel-labs/agent-browser 或浏览器 DevTools 手动截图。）');
    process.exit(2);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await pw.chromium.launch();
  const results = [];
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width: width, height: width < 700 ? 780 : 900 },
      deviceScaleFactor: 1,
      colorScheme: args.dark ? 'dark' : 'light',
      // 截图默认按"减弱动态"渲染：滚动揭示类内容直接可见，避免整段空白被误判为设计问题
      // 想连动效一起看，加 --motion（会自动滚一遍页面把所有揭示触发掉）
      reducedMotion: args.motion ? 'no-preference' : 'reduce',
    });
    if (args.seed) {
      await context.addInitScript(function (kv) {
        try { var i = kv.indexOf('='); localStorage.setItem(kv.slice(0, i), kv.slice(i + 1)); } catch (e) {}
      }, String(args.seed));
    }
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', function (msg) { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200)); });
    page.on('pageerror', function (err) { consoleErrors.push('pageerror: ' + String(err.message).slice(0, 200)); });
    let overflow = null;
    let layout = null;
    let navError = null;
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(600);
      if (args.motion) {
        await page.evaluate(async function () {
          var step = Math.round(window.innerHeight * 0.8);
          for (var y = 0; y < document.body.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise(function (r) { setTimeout(r, 130); });
          }
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(500);
      }
      if (args.scroll) {
        await page.evaluate(function (y) { window.scrollTo(0, Number(y)); }, String(args.scroll));
        await page.waitForTimeout(400);
      }
      layout = await page.evaluate(function () {
        const de = document.documentElement;
        const offenders = [];
        document.querySelectorAll('body *').forEach(function (el) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1)) {
            if (offenders.length < 12) offenders.push({ tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 60), left: Math.round(r.left), right: Math.round(r.right) });
          }
        });
        return { scrollWidth: de.scrollWidth, innerWidth: window.innerWidth, offenders: offenders };
      });
      overflow = layout.scrollWidth > layout.innerWidth + 1;
      const file = path.join(outDir, label + '-' + width + '.png');
      await page.screenshot({ path: file, fullPage: fullPage });
    } catch (e) { navError = String(e.message).slice(0, 200); }
    results.push({ width: width, overflow: overflow, horizontalOffenders: layout ? layout.offenders : [], consoleErrors: consoleErrors, navigationError: navError });
    await context.close();
  }
  await browser.close();

  const report = { url: url, label: label, dark: !!args.dark, widths: widths, results: results };
  fs.writeFileSync(path.join(outDir, label + '-report.json'), JSON.stringify(report, null, 2), 'utf8');
  const problems = results.filter(function (r) { return r.overflow || r.consoleErrors.length || r.navigationError; });
  console.log(JSON.stringify({ out: outDir, shots: results.length, problems: problems.length, detail: problems }, null, 2));
  if (problems.length) process.exitCode = 1;
}

main().catch(function (e) { console.error('截图失败: ' + e.message); process.exit(1); });
