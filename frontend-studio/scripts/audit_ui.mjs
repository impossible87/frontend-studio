#!/usr/bin/env node
/**
 * audit_ui.mjs —— 机械质量检查（无障碍 / 响应式 / 对比度 / 动效属性）
 * 用法: node audit_ui.mjs --dir . [--out audit.md]
 * 说明: 报告静态风险线索，每条带 文件:行号 与严重级别；不能替代浏览器与人眼终检（references/00）。
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
const SKIP = ['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', 'coverage', '.cache', 'shots'];
const CODE = /\.(html|htm|css|scss|sass|less|js|jsx|ts|tsx|vue|svelte)$/;

function walk(dir, acc, depth) {
  if (depth > 8) return acc;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (SKIP.includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc, depth + 1);
    else if (CODE.test(e.name)) acc.push(full);
  }
  return acc;
}

function lineOf(text, index) { return text.slice(0, index).split('\n').length; }
function findAll(text, re) {
  const out = []; let m;
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = r.exec(text))) { out.push({ line: lineOf(text, m.index), text: m[0].trim().slice(0, 600) }); if (m.index === r.lastIndex) r.lastIndex++; }
  return out;
}

/* ---------- 颜色解析与对比度 ---------- */
function parseColor(input) {
  const s = String(input).trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3})$/);
  if (m) return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16)];
  m = s.match(/^#([0-9a-f]{6})$/);
  if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
  m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  m = s.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)/);
  if (m) {
    const L = m[1].endsWith('%') ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
    const C = parseFloat(m[2]); const H = parseFloat(m[3]) * Math.PI / 180;
    const a = C * Math.cos(H), b = C * Math.sin(H);
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    const l = l_ ** 3, mm = m_ ** 3, ss = s_ ** 3;
    const lin = [
      4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * ss,
      -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * ss,
      -0.0041960863 * l - 0.7034186147 * mm + 1.7076147010 * ss,
    ];
    return lin.map(function (v) { return Math.min(255, Math.max(0, (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055) * 255)); });
  }
  return null;
}
function luminance(rgb) {
  const v = rgb.map(function (c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function contrast(a, b) {
  const ca = parseColor(a), cb = parseColor(b);
  if (!ca || !cb) return null;
  const la = luminance(ca), lb = luminance(cb);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

/* ---------- 从 CSS 里收集自定义属性并解引用 ---------- */
function extractBlock(cssText, selectorRe) {
  const m = selectorRe.exec(cssText);
  if (!m) return '';
  const open = cssText.indexOf('{', m.index);
  if (open < 0) return '';
  let depth = 0;
  for (let j = open; j < cssText.length; j++) {
    const ch = cssText[j];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return cssText.slice(open + 1, j); }
  }
  return '';
}
function collectBlocks(cssText, selectorRe) {
  const out = [];
  const re = new RegExp(selectorRe.source, selectorRe.flags.indexOf('g') >= 0 ? selectorRe.flags : selectorRe.flags + 'g');
  let m;
  while ((m = re.exec(cssText))) {
    const open = cssText.indexOf('{', m.index);
    if (open < 0) { re.lastIndex = m.index + 1; continue; }
    let depth = 0; let end = -1;
    for (let j = open; j < cssText.length; j++) {
      const ch = cssText[j];
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { end = j; break; } }
    }
    if (end > open) out.push(cssText.slice(open + 1, end));
    re.lastIndex = Math.max(re.lastIndex, open);
  }
  return out;
}
function collectVars(cssText, theme) {
  const vars = {};
  const blocks = [];
  const patterns = theme === 'dark'
    ? [/:root\[data-theme=["']dark["']\]/g, /\.theme-dark(?=\s*[{,])/g, /:root:not\(\[data-theme=["']light["']\]\)/g]
    : [/:root(?=\s*[{,])/g];
  patterns.forEach(function (re) { collectBlocks(cssText, re).forEach(function (b) { blocks.push(b); }); });
  blocks.forEach(function (b) {
    const re = /--([a-z0-9-]+)\s*:\s*([^;}\n]+);/gi; let m;
    while ((m = re.exec(b))) vars['--' + m[1].toLowerCase()] = m[2].trim();
  });
  return vars;
}
function resolveVar(value, vars, depth) {
  if (depth > 4 || !value) return value;
  const m = String(value).match(/^var\(\s*(--[a-z0-9-]+)\s*(?:,([^)]*))?\)$/i);
  if (!m) return value;
  const target = vars[m[1].toLowerCase()];
  if (!target) return m[2] ? m[2].trim() : null;
  return resolveVar(target, vars, depth + 1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dir = String(args.dir || '.');
  const files = walk(dir, [], 0);
  const issues = [];
  const push = (severity, file, line, problem, fix) => issues.push({ severity, file: path.relative(dir, file) || file, line, problem, fix });

  const htmlFiles = files.filter(function (f) { return /\.(html|htm|vue|svelte|jsx|tsx)$/.test(f); });
  const styleFiles = files.filter(function (f) { return /\.(css|scss|sass|less)$/.test(f); });
  const scriptFiles = files.filter(function (f) { return /\.(js|jsx|ts|tsx|vue|svelte)$/.test(f); });

  /* ---------- HTML / 模板检查 ---------- */
  for (const f of htmlFiles) {
    const t = fs.readFileSync(f, 'utf8');
    if (/\.(html|htm)$/.test(f)) {
      if (!/<html[^>]*\blang=/i.test(t)) push('高', f, 1, 'html 缺少 lang 属性', '加 <html lang="zh-CN">');
      if (!/<title[^>]*>\s*\S/i.test(t)) push('高', f, 1, '缺少 title', '写一个 ≤60 字符的页面标题');
      if (!/<meta[^>]+name=["']description["']/i.test(t)) push('中', f, 1, '缺少 meta description', '补 150 字以内的描述');
      if (!/<meta[^>]+name=["']viewport["']/i.test(t)) push('阻断', f, 1, '缺少 viewport meta', '加 <meta name="viewport" content="width=device-width, initial-scale=1">');
    }
    const h1 = findAll(t, /<h1\b/gi);
    if (h1.length === 0) push('高', f, 1, '页面没有 h1', '给主标题用 h1，且每页唯一');
    if (h1.length > 1) push('中', f, h1[1].line, '页面有 ' + h1.length + ' 个 h1', '只保留一个 h1');
    const hs = findAll(t, /<h([1-6])\b/gi).map(function (x) { return { line: x.line, level: Number(x.text.match(/[1-6]/)[0]) }; });
    for (let i = 1; i < hs.length; i++) if (hs[i].level - hs[i - 1].level > 1) push('中', f, hs[i].line, '标题层级从 h' + hs[i - 1].level + ' 跳到 h' + hs[i].level, '层级不要跳级');
    findAll(t, /<img\b[^>]*>/gi).forEach(function (x) {
      if (!/\balt=/.test(x.text)) push('高', f, x.line, 'img 缺少 alt', '内容图写描述，装饰图写 alt=""');
    });
    findAll(t, /<a\b[^>]*href=["']#["']/gi).forEach(function (x) { push('中', f, x.line, '链接指向 # (占位)', '换成真实地址或改成 button'); });
    findAll(t, /<a\b[^>]*target=["']_blank["'][^>]*>/gi).forEach(function (x) {
      if (!/rel=["'][^"']*noopener/.test(x.text)) push('中', f, x.line, 'target="_blank" 缺少 rel="noopener"', '加 rel="noopener noreferrer"');
    });
    findAll(t, /\btabindex=["']([1-9]\d*)["']/gi).forEach(function (x) { push('中', f, x.line, '使用了正数 tabindex', '改用 DOM 顺序，不要正数 tabindex'); });
    findAll(t, /<(?:video|audio)[^>]*\bautoplay\b/gi).forEach(function (x) { push('中', f, x.line, '媒体自动播放', '加 muted 或改为用户触发'); });
    findAll(t, /<div\b[^>]*\bonclick=/gi).forEach(function (x) { push('高', f, x.line, 'div 绑定 click（不可键盘访问）', '改用 button，或补 role/tabindex/键处理'); });
    const inputs = findAll(t, /<input\b[^>]*>/gi).filter(function (x) { return !/type=["'](hidden|submit|button|checkbox|radio)["']/i.test(x.text); });
    const labelFor = findAll(t, /<label\b[^>]*\bfor=/gi).length;
    const named = (t.match(/<input\b[^>]*(?:aria-label|aria-labelledby|\btitle=)[^>]*>/gi) || []).length;
    if (inputs.length > labelFor + named) push('高', f, inputs[0] ? inputs[0].line : 1, (inputs.length - labelFor - named) + ' 个输入框既没有 label[for] 也没有 aria-label', '补 label 或 aria-label，placeholder 不能代替');
    findAll(t, /<button\b[^>]*>\s*<\/button>/gi).forEach(function (x) {
      if (!/aria-label|title=/.test(x.text)) push('高', f, x.line, '空按钮且无可访问名', '加文字或 aria-label');
    });
  }

  /* ---------- CSS / 脚本检查 ---------- */
  let hasReducedMotion = false;
  let hasAnimation = false;
  for (const f of styleFiles.concat(scriptFiles).concat(htmlFiles)) {
    const t = fs.readFileSync(f, 'utf8');
    // 仅是风险线索，不能判断语义角色、级联后的尺寸或 WCAG 是否失败。
    findAll(t, /font-size\s*:\s*(\d+(?:\.\d+)?)px\b/gi).forEach(function (x) {
      const value = Number(x.text.match(/:\s*([\d.]+)/)[1]);
      if (value < 14) push('低', f, x.line, '小字号需人工复核：' + x.text, '核对是否核心正文/操作；优先 typography tokens，次要或装饰角色需有理由，不单凭字号判失败');
    });
    if (/prefers-reduced-motion/.test(t)) hasReducedMotion = true;
    if (/\banimation\s*:|transition\s*:|@keyframes|\banimate\(/.test(t)) hasAnimation = true;
    findAll(t, /outline\s*:\s*(?:none|0)/gi).forEach(function (x) {
      if (!/:focus-visible/.test(t)) push('高', f, x.line, '去掉 outline 且无 focus-visible 替代', '用 :focus-visible 提供可见焦点');
    });
    findAll(t, /transition\s*:[^;{}]*\b(?:width|height|top|left|right|bottom|margin|padding|border-width|font-size)\b/gi).forEach(function (x) {
      push('中', f, x.line, '布局过渡风险，需运行验证：' + x.text, '优先 transform / opacity；折叠等例外按 05 记录目的与运行证据');
    });
    findAll(t, /animation\s*:[^;{}]*\b(?:width|height|top|left|margin|padding)\b/gi).forEach(function (x) {
      push('中', f, x.line, '动画声明含布局属性词，需检查对应关键帧：' + x.text, '核对实际动画属性；静态匹配不证明发生重排');
    });
    findAll(t, /\b100vh\b/g).forEach(function (x) { push('中', f, x.line, '使用 100vh（移动端地址栏问题）', '改用 100svh / 100dvh'); });
    const rmRanges = [];
    { const re = /@media[^{]*(?:prefers-reduced-motion|print)[^{]*\{/g; let rmm;
      while ((rmm = re.exec(t))) {
        const open = t.indexOf('{', rmm.index); let depth = 0; let end = open;
        for (let j = open; j < t.length; j++) { const c = t[j]; if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) { end = j; break; } } }
        rmRanges.push([lineOf(t, rmm.index), lineOf(t, end)]);
      } }
    findAll(t, /!\s*important\b/g).forEach(function (x) {
      if (rmRanges.some(function (rg) { return x.line >= rg[0] && x.line <= rg[1]; })) return;
      push('低', f, x.line, '使用 !important', '用选择器层级或 token 解决（减弱动态块内属标准做法，不报）');
    });
    findAll(t, /\btabindex\s*=\s*["']?[1-9]/g).forEach(function (x) { push('中', f, x.line, '正数 tabindex', '移除'); });
    findAll(t, /<marquee\b/gi).forEach(function (x) { push('高', f, x.line, 'marquee 标签', '改用 CSS 动画并尊重 reduced-motion'); });
  }
  if (hasAnimation && !hasReducedMotion) push('高', projectRoot(styleFiles, scriptFiles), 1, '项目有动画但没有任何 prefers-reduced-motion 处理', '加全局减弱动态规则（见 05 §6）');

  /* ---------- 硬编码 color/background 对比度（无 token 的项目也能查） ---------- */
  for (const f of styleFiles.concat(htmlFiles)) {
    const t = fs.readFileSync(f, 'utf8');
    const re = /\{([^{}]*)\}/g; let rm;
    while ((rm = re.exec(t))) {
      const body = rm[1];
      const fgM = body.match(/(?:^|[;\s])color\s*:\s*([^;]+)/i);
      const bgM = body.match(/background(?:-color)?\s*:\s*([^;]+)/i);
      if (!fgM || !bgM) continue;
      const fgV = fgM[1].trim(), bgV = bgM[1].trim();
      if (/var\(|currentcolor|inherit|transparent|gradient|url\(/i.test(fgV + bgV)) continue;
      const c = contrast(fgV, bgV);
      if (c !== null && c < 4.5) push('高', f, lineOf(t, rm.index), '硬编码文本对比度仅 ' + c + ':1（' + fgV + ' 在 ' + bgV + ' 上）', '调整色值或改走 token，正文需 ≥4.5:1');
    }
  }

  /* ---------- 对比度（从自定义属性推导） ---------- */
  const cssAll = styleFiles.map(function (f) { return fs.readFileSync(f, 'utf8'); }).join('\n');
  const theme = args.theme ? String(args.theme) : 'light';
  const vars = collectVars(cssAll, theme);
  const pair = (a, b) => [resolveVar(vars[a], vars, 0), resolveVar(vars[b], vars, 0)];
  const contrasts = [];
  const checks = [
    ['--fg', '--bg', 4.5, '正文'],
    ['--fg-muted', '--bg', 4.5, '说明文字'],
    ['--fg-subtle', '--bg', 4.5, '次要文字'],
    ['--accent-fg', '--accent', 4.5, '强调色上的文字'],
    ['--border-strong', '--bg', 3, 'UI 边界'],
  ];
  for (const [fgName, bgName, min, label] of checks) {
    const [fg, bg] = pair(fgName, bgName);
    if (!fg || !bg) continue;
    const c = contrast(fg, bg);
    if (c === null) continue;
    const ok = c >= min;
    contrasts.push({ label, pair: fgName + ' / ' + bgName, ratio: c, min, ok });
    if (!ok) push('高', projectRoot(styleFiles, scriptFiles), 1, label + ' 对比度仅 ' + c + ':1（要求 ≥ ' + min + ':1）', '调深文字或调浅/调深底色');
  }

  /* ---------- 输出 ---------- */
  const order = { '阻断': 0, '高': 1, '中': 2, '低': 3 };
  issues.sort(function (a, b) { return order[a.severity] - order[b.severity]; });
  const lines = [];
  lines.push('# UI 机械审查报告');
  lines.push('');
  lines.push('- 扫描文件: ' + files.length + '（样式 ' + styleFiles.length + ' / 模板 ' + htmlFiles.length + ' / 脚本 ' + scriptFiles.length + '）');
  lines.push('- 时间: ' + new Date().toISOString());
  lines.push('- 对比度检查作用域: ' + (theme === 'dark' ? '暗色主题' : '浅色 :root'));
  lines.push('- 问题合计: ' + issues.length + '（阻断 ' + issues.filter(function (i) { return i.severity === '阻断'; }).length + ' / 高 ' + issues.filter(function (i) { return i.severity === '高'; }).length + ' / 中 ' + issues.filter(function (i) { return i.severity === '中'; }).length + ' / 低 ' + issues.filter(function (i) { return i.severity === '低'; }).length + '）');
  lines.push('');
  lines.push('## 对比度');
  lines.push('');
  if (!contrasts.length) lines.push('未找到可解析的语义 token（--bg/--fg 等），此节跳过。可先套用 assets/css/tokens.css。用 --theme dark 可检查暗色主题。');
  else { lines.push('| 用途 | 组合 | 实测 | 要求 | 结果 |'); lines.push('|---|---|---|---|---|'); contrasts.forEach(function (c) { lines.push('| ' + c.label + ' | ' + c.pair + ' | ' + c.ratio + ':1 | ' + c.min + ':1 | ' + (c.ok ? '通过' : '**不通过**') + ' |'); }); }
  lines.push('');
  lines.push('## 问题清单');
  lines.push('');
  if (!issues.length) lines.push('未发现机械问题。仍需做人眼终检（references/00 §2）与 Lighthouse。');
  else { issues.forEach(function (i, n) { lines.push((n + 1) + '. **[' + i.severity + ']** ' + i.file + ':' + i.line + ' — ' + i.problem); lines.push('   - 修法: ' + i.fix); }); }
  lines.push('');
  lines.push('> 本报告提供静态风险线索，不能证明运行时可访问性或性能。浏览器、人眼终检与 Lighthouse 需另行核验。');
  const md = lines.join('\n');
  if (args.out) { fs.writeFileSync(String(args.out), md, 'utf8'); console.log('已写出 ' + args.out); }
  console.log(JSON.stringify({ files: files.length, issues: issues.length, bySeverity: { '阻断': issues.filter(function (i) { return i.severity === '阻断'; }).length, '高': issues.filter(function (i) { return i.severity === '高'; }).length, '中': issues.filter(function (i) { return i.severity === '中'; }).length, '低': issues.filter(function (i) { return i.severity === '低'; }).length }, contrasts: contrasts }, null, 2));
}

function projectRoot(styleFiles, scriptFiles) { return (styleFiles[0] || scriptFiles[0] || '.'); }

main();
