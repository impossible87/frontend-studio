#!/usr/bin/env node
/**
 * extract_tokens.mjs —— 抽取并聚类设计 token，指出"失控"的地方
 * 用法: node extract_tokens.mjs --dir ./src [--out tokens.report.json]
 *       node extract_tokens.mjs --css ./styles/tokens.css
 * 关键区分:
 *   paletteDefined = 通过自定义属性（--x: ...）声明的调色板 —— 这是设计系统，不算问题
 *   adHoc          = 直接硬编码在样式里的颜色 —— 这才是失控
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const n = argv[i + 1]; if (n === undefined || n.startsWith('--')) out[k] = true; else { out[k] = n; i++; } }
  }
  return out;
}

const RE_COLOR = /#(?:[0-9a-fA-F]{3,8})\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)/g;
const RE_CUSTOM = /--([a-z0-9-]+)\s*:\s*([^;}\n]+);/gi;
const COLORISH = /(color|bg|fg|border|accent|paper|ink|surface|tint|shade)/;

function walk(dir, acc, depth) {
  if (depth > 6) return acc;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', 'coverage'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc, depth + 1);
    else if (/\.(css|scss|sass|less|vue|svelte|jsx|tsx|js|ts|html)$/.test(e.name)) acc.push(full);
  }
  return acc;
}

function normalizeColor(c) {
  const s = String(c).trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(s)) return '#' + s.slice(1).split('').map(function (ch) { return ch + ch; }).join('');
  if (/^#[0-9a-f]{4}$/.test(s)) return '#' + s.slice(1, 4).split('').map(function (ch) { return ch + ch; }).join('');
  return s.replace(/\s+/g, ' ');
}
function toRgb(c) {
  const s = normalizeColor(c);
  let m = s.match(/^#([0-9a-f]{6})$/);
  if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
  m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  m = s.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)/);
  if (m) {
    const L = m[1].endsWith('%') ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
    const C = parseFloat(m[2]), H = parseFloat(m[3]) * Math.PI / 180;
    const a = C * Math.cos(H), b = C * Math.sin(H);
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    const l = l_ ** 3, mm = m_ ** 3, ss = s_ ** 3;
    const lin = [4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * ss, -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * ss, -0.0041960863 * l - 0.7034186147 * mm + 1.7076147010 * ss];
    return lin.map(function (v) { return Math.round(Math.min(1, Math.max(0, v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055)) * 255); });
  }
  return null;
}
function distance(a, b) {
  const ra = toRgb(a), rb = toRgb(b);
  if (!ra || !rb) return 999;
  return Math.round(Math.sqrt((ra[0] - rb[0]) ** 2 + (ra[1] - rb[1]) ** 2 + (ra[2] - rb[2]) ** 2));
}
function cluster(entries, threshold) {
  const groups = [];
  entries.forEach(function (e) {
    const hit = groups.find(function (g) { return distance(g.anchor, e.value) <= threshold; });
    if (hit) { hit.members.push(e); hit.count += e.count; }
    else groups.push({ anchor: e.value, count: e.count, members: [e] });
  });
  return groups.sort(function (a, b) { return b.count - a.count; });
}
function tally(list) {
  const m = new Map();
  list.forEach(function (v) { const k = String(v).trim().replace(/\s+/g, ' '); if (k) m.set(k, (m.get(k) || 0) + 1); });
  return [...m.entries()].map(function (p) { return { value: p[0], count: p[1] }; }).sort(function (a, b) { return b.count - a.count; });
}

// 静态声明报告：候选栈不等于浏览器实际渲染字体，也不能证明字重或字形覆盖。
function splitFamilyList(value) {
  const parts = []; let start = 0; let quote = ''; let depth = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '\\') { i++; continue; }
    if (quote) { if (ch === quote) quote = ''; continue; }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(value.slice(start, i).trim()); start = i + 1; }
    if (depth < 0) throw new Error('括号不匹配');
  }
  if (quote || depth) throw new Error('引号或括号不完整');
  parts.push(value.slice(start).trim());
  return parts;
}

export function collectFontStacks(source) {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const definitions = new Map();
  const declarations = [];
  const references = new Set(); const unresolved = [];
  const record = (value, reason) => {
    if (!unresolved.some(item => item.value === value && item.reason === reason)) unresolved.push({ value, reason });
  };
  for (const match of text.matchAll(/--([a-z0-9-]+)\s*:\s*([^;}\n]+);/gi)) {
    const name = '--' + match[1]; const value = match[2].trim();
    if (!definitions.has(name)) definitions.set(name, new Set());
    definitions.get(name).add(value);
    if (/^--font-(?!weight\b|size\b|style\b|stretch\b|variant\b|feature\b|variation\b|synthesis\b|leading\b|tracking\b)/i.test(name)) declarations.push(value);
  }
  for (const match of text.matchAll(/(?<![\w-])font-family\s*:\s*([^;}\n]+)/gi)) declarations.push(match[1].trim());

  function expand(value, seen = new Set()) {
    const start = value.indexOf('var(');
    if (start < 0) return [value];
    let depth = 1; let end = start + 4;
    for (; end < value.length && depth; end++) {
      if (value[end] === '(') depth++;
      if (value[end] === ')') depth--;
    }
    if (depth) { record(value, '变量括号不完整'); return []; }
    let args;
    try { args = splitFamilyList(value.slice(start + 4, end - 1)); }
    catch (error) { record(value, error.message); return []; }
    const name = args[0]; references.add(name);
    if (!/^--[\w-]+$/.test(name) || seen.has(name)) { record(value, '无效或循环变量引用'); return []; }
    const candidates = definitions.get(name) || (args.length > 1 ? new Set([args.slice(1).join(', ')]) : null);
    if (!candidates) { record(value, '变量未定义'); return []; }
    const result = [];
    for (const candidate of candidates) {
      for (const resolved of expand(candidate, new Set([...seen, name]))) {
        result.push(...expand(value.slice(0, start) + resolved + value.slice(end), seen));
        if (result.length > 32) { record(value, '静态分支过多，需浏览器确认'); return result.slice(0, 32); }
      }
    }
    return result;
  }

  const generic = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|emoji|math|fangsong)$/i;
  const stacks = new Map();
  for (const declaration of declarations) {
    for (const value of expand(declaration)) {
      try {
        const raw = splitFamilyList(value);
        const families = raw.map(item => {
          const quoted = /^("[\s\S]*"|'[\s\S]*')$/.test(item);
          if (!quoted && (!/^-?[a-z_\u0080-\uffff][\w\s\u0080-\uffff-]*$/i.test(item) || /^(inherit|initial|unset|revert|revert-layer)$/i.test(item))) throw new Error('无法静态解析字体声明');
          return quoted ? item.slice(1, -1) : item;
        });
        if (families.some(item => !item)) throw new Error('空字体名称');
        const key = families.map((item, index) => (!/^["']/.test(raw[index]) && generic.test(item) ? 'generic:' : 'family:') + item.toLowerCase()).join('\u0000');
        const entry = stacks.get(key);
        if (entry) entry.count++;
        else stacks.set(key, { value: raw.join(', '), count: 1, families, primary: families[0], fallbacks: families.slice(1), genericFamilies: families.filter((item, index) => !/^["']/.test(raw[index]) && generic.test(item)) });
      } catch (error) { record(declaration, error.message); }
    }
  }
  const list = [...stacks.values()];
  return {
    total: list.length, top: list.slice(0, 12).map(({ value, count }) => ({ value, count })),
    stacks: list, references: [...references], unresolved, renderedVerified: false,
    countMeaning: '静态声明栈数量，不是实际渲染家族数量；不同主题分支也会计入',
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let text = ''; let scanned = 0;
  if (args.css) { text = fs.readFileSync(String(args.css), 'utf8'); scanned = 1; }
  else {
    const dir = String(args.dir || '.');
    walk(dir, [], 0).forEach(function (f) { try { text += '\n' + fs.readFileSync(f, 'utf8'); scanned++; } catch { /* ignore */ } });
  }

  // 1) 自定义属性 = 设计系统真源
  const pairs = []; { const re = new RegExp(RE_CUSTOM.source, 'gi'); let m; while ((m = re.exec(text))) pairs.push({ name: '--' + m[1].toLowerCase(), value: m[2].trim() }); }
  const definedColors = new Set(pairs.filter(function (p) { return COLORISH.test(p.name); }).map(function (p) { return normalizeColor(p.value); }));
  const defRadius = pairs.filter(function (p) { return /radius/.test(p.name); }).map(function (p) { return p.value; });
  const defShadow = pairs.filter(function (p) { return /shadow/.test(p.name); }).map(function (p) { return p.value; });
  const defSpace = pairs.filter(function (p) { return /(space|gap|pad|margin|inset)/.test(p.name) && /^-?[\d.]+(px|rem|em)$/.test(p.value); }).map(function (p) { return p.value; });

  // 2) 字面量 = 实际用量（其中不在调色板里的就是硬编码）
  const literalColors = tally((text.match(RE_COLOR) || []).map(normalizeColor)).filter(function (c) { return !c.value.startsWith('var('); });
  const adHoc = literalColors.filter(function (c) { return !definedColors.has(c.value); });
  const fonts = collectFontStacks(text);
  const radius = tally(defRadius.concat((text.match(/border-radius\s*:\s*([^;}\n]+)/gi) || []).map(function (d) { return d.split(':').slice(1).join(':').trim(); })));
  const shadows = tally(defShadow.concat((text.match(/box-shadow\s*:\s*([^;}\n]+)/gi) || []).map(function (d) { return d.split(':').slice(1).join(':').trim(); })));
  const spacing = tally(defSpace.concat((text.match(/(?:margin|padding|gap|inset)[^;{}\n]*:\s*([^;}\n]+)/gi) || []).flatMap(function (d) { return d.split(':').slice(1).join(':').split(/\s+/); }).filter(function (v) { return /^-?[\d.]+(px|rem|em)$/.test(v); })));

  const report = {
    scannedFiles: scanned,
    colors: {
      paletteDefined: definedColors.size,
      literalUsed: literalColors.length,
      hardcoded: { total: adHoc.length, top: adHoc.slice(0, 20) },
      nearDuplicateGroups: cluster(tally([...definedColors].concat(literalColors.map(function (c) { return c.value; }))), 10).filter(function (g) { return g.members.length > 1; }).slice(0, 20).map(function (g) { return { representative: g.anchor, variants: g.members.length, members: g.members.map(function (m) { return m.value; }) }; }),
      palette: [...definedColors].slice(0, 60),
    },
    fonts: fonts,
    radius: { total: radius.length, top: radius.slice(0, 12) },
    shadows: { total: shadows.length, top: shadows.slice(0, 10) },
    spacing: { total: spacing.length, top: spacing.slice(0, 20) },
    customProperties: { total: pairs.length, preview: pairs.slice(0, 40).map(function (p) { return p.name; }) },
    findings: [],
  };

  const f = report.findings;
  if (adHoc.length > 6) f.push('硬编码颜色 ' + adHoc.length + ' 种（不在任何自定义属性里）：应收敛进 token 层。示例 ' + adHoc.slice(0, 4).map(function (c) { return c.value; }).join(', '));
  if (report.colors.nearDuplicateGroups.length) f.push('存在 ' + report.colors.nearDuplicateGroups.length + ' 组近似色（RGB 距离 ≤10）：手调失控，应合并');
  if (report.colors.paletteDefined > 24) f.push('调色板 ' + report.colors.paletteDefined + ' 个色值：偏大，检查是否缺少"少而准"的色阶纪律');
  if (report.fonts.total > 3) f.push('声明字体栈 ' + report.fonts.total + ' 组：按角色与主题人工复核；回退候选不等于已渲染家族，不要求机械削减');
  if (report.fonts.unresolved.length) f.push('有 ' + report.fonts.unresolved.length + ' 条字体声明无法静态解析：检查变量与浏览器实际字体');
  if (report.radius.total > 4) f.push('圆角 ' + report.radius.total + ' 种（>4）：定 3 档规则 + 全圆');
  if (report.shadows.total > 3) f.push('阴影 ' + report.shadows.total + ' 种（>3）：统一光源，收敛为三级');
  const odd = report.spacing.top.filter(function (s) { return /(?:1[1379]|2[13]|3[37]|4[13])px$/.test(s.value); });
  if (odd.length) f.push('出现随手间距值（' + odd.slice(0, 5).map(function (s) { return s.value; }).join(', ') + '）：改用 4/8 基数尺度');

  const json = JSON.stringify(report, null, 2);
  if (args.out) { fs.writeFileSync(String(args.out), json, 'utf8'); console.log('已写出 ' + args.out); }
  console.log(JSON.stringify({ scannedFiles: scanned, paletteDefined: report.colors.paletteDefined, hardcodedColors: adHoc.length, fonts: report.fonts.total, radius: report.radius.total, shadows: report.shadows.total, spacing: report.spacing.total, customProperties: pairs.length, findings: f }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
