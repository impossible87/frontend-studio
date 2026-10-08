#!/usr/bin/env node
/**
 * ingest_site.mjs —— 站点画像
 * 用法:
 *   node ingest_site.mjs --url https://example.com --out site-profile.json
 *   node ingest_site.mjs --dir ./src --out site-profile.json
 * 目标: 产出 references/11-site-profiling.md 里定义的 site-profile.json
 * 依赖: 仅 Node 内置模块。
 */
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    }
  }
  return out;
}

const RE_COLOR = /#(?:[0-9a-fA-F]{3,8})\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)/g;
const RE_FONT = /font-family\s*:\s*([^;}\n]+)/gi;
const RE_RADIUS = /border-radius\s*:\s*([^;}\n]+)/gi;
const RE_SHADOW = /box-shadow\s*:\s*([^;}\n]+)/gi;
const RE_SPACE = /(?:^|[;{\s])(?:margin|padding|gap|row-gap|column-gap|inset)\s*:\s*([^;}\n]+)/gi;

function count(list) {
  const m = new Map();
  for (const v of list) {
    const k = String(v).trim().replace(/\s+/g, ' ').toLowerCase();
    if (!k) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
const top = (pairs, n) => pairs.slice(0, n).map(([value, count]) => ({ value, count }));

function stripTags(s) { return String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }

function analyzeCss(css) {
  const colors = count(css.match(RE_COLOR) || []);
  const families = count((css.match(RE_FONT) || []).flatMap(function (d) {
    return d.replace(/font-family\s*:/i, '').split(',').map(function (f) { return f.replace(/["']/g, '').trim(); });
  }).filter(Boolean));
  const radii = count((css.match(RE_RADIUS) || []).map(function (d) { return d.split(':')[1]; }));
  const shadows = count((css.match(RE_SHADOW) || []).map(function (d) { return d.split(':').slice(1).join(':'); }));
  const spacing = count((css.match(RE_SPACE) || []).flatMap(function (d) {
    return d.split(':').slice(1).join(':').split(/\s+/);
  }).filter(function (v) { return /^-?[\d.]+(px|rem|em|%)$/.test(v); }));
  // 自定义属性即真源（token 化项目）：把定义值一并计入
  const custRe = /--([a-z0-9-]+)\s*:\s*([^;}\n]+);/gi; let cm;
  const extra = { colors: [], fonts: [], radius: [], shadows: [], spacing: [] };
  while ((cm = custRe.exec(css))) {
    const name = cm[1].toLowerCase(), val = cm[2].trim();
    if (/font/.test(name)) val.replace(/["']/g, '').split(',').forEach(function (f2) { if (f2.trim()) extra.fonts.push(f2.trim()); });
    else if (/radius/.test(name)) extra.radius.push(val);
    else if (/shadow/.test(name)) extra.shadows.push(val);
    else if (/(space|gap|pad|margin|inset)/.test(name) && /^-?[\d.]+(px|rem|em)$/.test(val)) extra.spacing.push(val);
    else if (/(color|bg|fg|border|accent|paper|ink|surface)/.test(name)) extra.colors.push(val);
  }
  const merge = function (pairs, more) { return count(pairs.map(function (p) { return p[0]; }).concat(more)); };
  const c2 = merge(colors, extra.colors), f2 = merge(families, extra.fonts), r2 = merge(radii, extra.radius), s2 = merge(shadows, extra.shadows), sp2 = merge(spacing, extra.spacing);
  return {
    colors: top(c2, 24),
    fonts: top(f2, 10),
    radius: top(r2, 12),
    shadows: top(s2, 8),
    spacing: top(sp2, 16),
    cssSize: css.length,
  };
}

function sectionsFromHeadings(headings, buttons) {
  const map = [
    [/price|pricing|plan|套餐|价格|收费/i, 'pricing'],
    [/faq|question|常见问题|问答/i, 'faq'],
    [/testimonial|review|customer|客户|评价|案例/i, 'proof'],
    [/feature|benefit|why|功能|优势|能力|特点/i, 'features'],
    [/how|step|process|流程|步骤|如何/i, 'process'],
    [/contact|联系|咨询/i, 'contact'],
    [/blog|news|文章|资讯/i, 'content'],
  ];
  const out = [];
  let order = 0;
  headings.forEach(function (h, i) {
    let kind = i === 0 && h.level === 1 ? 'hero' : 'content';
    for (const [re, k] of map) { if (re.test(h.text)) { kind = k; break; } }
    if (i > 0 && kind === 'content' && /start|get|try|开始|免费|立即|预约|购买/i.test(h.text)) kind = 'cta';
    out.push({ order: ++order, kind: kind, level: h.level, headline: h.text.slice(0, 120) });
  });
  if (buttons.length) out.push({ order: ++order, kind: 'cta-buttons', labels: buttons.slice(0, 8) });
  return out;
}

function extractHtml(html, baseUrl) {
  const pick = (re) => { const m = html.match(re); return m ? m[1] : null; };
  const title = stripTags(pick(/<title[^>]*>([\s\S]*?)<\/title>/i) || '');
  const description = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || [])[1] || null;
  const lang = (html.match(/<html[^>]+lang=["']([^"']+)["']/i) || [])[1] || null;
  const headings = [];
  const reH = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = reH.exec(html))) headings.push({ level: Number(m[1]), text: stripTags(m[2]) });
  const buttons = [];
  const reB = /<(?:button|a)\b[^>]*>([\s\S]*?)<\/(?:button|a)>/gi;
  while ((m = reB.exec(html))) {
    const t = stripTags(m[1]);
    if (t && t.length < 40) buttons.push(t);
  }
  const links = [...new Set((html.match(/<a\b[^>]*href=["']([^"']+)["']/gi) || []).map(function (a) {
    return (a.match(/href=["']([^"']+)["']/i) || [])[1];
  }).filter(function (h) { return h && !h.startsWith('javascript:'); }))];
  const imgs = (html.match(/<img\b[^>]*>/gi) || []).map(function (tag) {
    return {
      src: (tag.match(/src=["']([^"']+)["']/i) || [])[1] || null,
      hasAlt: /\balt=/.test(tag),
      hasSize: /\bwidth=/.test(tag) && /\bheight=/.test(tag),
      lazy: /loading=["']lazy["']/i.test(tag),
    };
  });
  const cssLinks = (html.match(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi) || []).map(function (t) {
    return (t.match(/href=["']([^"']+)["']/i) || [])[1];
  }).filter(Boolean);
  const inlineCss = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || []).join('\n').replace(/<\/?style[^>]*>/gi, '');
  const scripts = (html.match(/<script\b[^>]*src=["']([^"']+)["']/gi) || []).map(function (t) {
    return (t.match(/src=["']([^"']+)["']/i) || [])[1];
  }).filter(Boolean);
  return { title, description, lang, headings, buttons, links, imgs, cssLinks, inlineCss, scripts };
}

function detectStack(html, deps, files) {
  const stack = [];
  const has = (re) => re.test(html || '');
  const dep = (n) => Object.prototype.hasOwnProperty.call(deps, n);
  if (has(/_next\/|__NEXT_DATA__/) || dep('next')) stack.push('next');
  if (has(/__nuxt|_nuxt\//) || dep('nuxt')) stack.push('nuxt');
  if (has(/wp-content|wp-includes/) || dep('wordpress')) stack.push('wordpress');
  if (dep('react') || has(/data-reactroot|react-dom/)) stack.push('react');
  if (dep('vue')) stack.push('vue');
  if (dep('svelte')) stack.push('svelte');
  if (dep('tailwindcss') || has(/class=["'][^"']*\b(?:flex|grid|px-\d|py-\d|text-\d?xl)\b/)) stack.push('tailwind');
  if (dep('framer-motion') || dep('motion')) stack.push('motion');
  if (dep('gsap')) stack.push('gsap');
  if (dep('bootstrap')) stack.push('bootstrap');
  if (dep('three')) stack.push('three');
  if ((files || []).some(function (f) { return /\.(scss|sass|less)$/.test(f); })) stack.push('preprocessor');
  return [...new Set(stack)];
}

function walk(dir, acc, depth) {
  if (depth > 6) return acc;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', 'coverage', 'shots', '.cache'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc, depth + 1);
    else acc.push(full);
  }
  return acc;
}

async function profileUrl(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'frontend-studio-ingest/1.0' } });
  const html = await res.text();
  const ex = extractHtml(html, url);
  let css = ex.inlineCss;
  const fetched = [];
  for (const href of ex.cssLinks.slice(0, 12)) {
    try {
      const abs = new URL(href, url).href;
      const r = await fetch(abs);
      css += '\n' + (await r.text());
      fetched.push(abs);
    } catch { /* 跨域/失败就跳过 */ }
  }
  const analyzed = analyzeCss(css);
  const deps = {};
  const stack = detectStack(html, deps, []);
  return {
    source: { type: 'url', value: url, fetchedAt: new Date().toISOString(), cssFetched: fetched.length },
    meta: { title: ex.title, description: ex.description, lang: ex.lang },
    techStack: stack,
    headings: ex.headings,
    sections: sectionsFromHeadings(ex.headings, ex.buttons),
    copy: { headlines: ex.headings.filter(function (h) { return h.level <= 2; }).map(function (h) { return h.text; }).slice(0, 20), ctas: [...new Set(ex.buttons)].slice(0, 20) },
    tokens: { colors: analyzed.colors, fonts: analyzed.fonts, radius: analyzed.radius, shadows: analyzed.shadows, spacing: analyzed.spacing },
    assets: { images: ex.imgs.length, imagesMissingAlt: ex.imgs.filter(function (i) { return !i.hasAlt; }).length, imagesMissingSize: ex.imgs.filter(function (i) { return !i.hasSize; }).length, scripts: ex.scripts.length },
    links: ex.links.slice(0, 120),
    issues: [],
  };
}

function profileDir(dir) {
  const files = walk(dir, [], 0);
  const rel = files.map(function (f) { return path.relative(dir, f).replace(/\\/g, '/'); });
  let deps = {};
  const pkgPath = files.find(function (f) { return /(^|\/)package\.json$/.test(f) && !/node_modules/.test(f); });
  if (pkgPath) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
    } catch { /* ignore */ }
  }
  const cssFiles = files.filter(function (f) { return /\.(css|scss|sass|less)$/.test(f); });
  let css = '';
  cssFiles.slice(0, 60).forEach(function (f) { try { css += '\n' + fs.readFileSync(f, 'utf8'); } catch { /* ignore */ } });
  const analyzed = analyzeCss(css);
  const htmlFiles = files.filter(function (f) { return /\.(html|htm)$/.test(f); });
  const compFiles = files.filter(function (f) { return /\.(jsx|tsx|vue|svelte)$/.test(f); });
  const pageFiles = files.filter(function (f) { return /(^|\/)(pages|app|routes|views)\//.test(f.replace(/\\/g, '/')); });
  const imgs = files.filter(function (f) { return /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(f); });
  // 解析每个 HTML 文件：标题/层级/区块/CTA/图片/链接 + 内联样式（单文件页面靠这里）
  const perPage = [];
  const allHeadings = []; const allButtons = []; const allLinks = []; let inlineCss = '';
  const imgStats = { total: 0, missingAlt: 0, missingSize: 0 };
  htmlFiles.slice(0, 30).forEach(function (f) {
    let t = '';
    try { t = fs.readFileSync(f, 'utf8'); } catch { return; }
    const ex = extractHtml(t, 'file:///' + String(f).replace(/\\/g, '/'));
    inlineCss += '\n' + ex.inlineCss;
    allHeadings.push.apply(allHeadings, ex.headings);
    allButtons.push.apply(allButtons, ex.buttons);
    allLinks.push.apply(allLinks, ex.links);
    ex.imgs.forEach(function (i) { imgStats.total++; if (!i.hasAlt) imgStats.missingAlt++; if (!i.hasSize) imgStats.missingSize++; });
    perPage.push({
      path: path.relative(dir, f).replace(/\\/g, '/'),
      title: ex.title, description: ex.description, lang: ex.lang,
      h1: ex.headings.filter(function (h) { return h.level === 1; }).length,
      headingCount: ex.headings.length,
      sections: sectionsFromHeadings(ex.headings, ex.buttons).map(function (s) { return s.kind; }),
      ctas: [...new Set(ex.buttons)].slice(0, 8),
      links: ex.links.length, images: ex.imgs.length,
      inlineCssBytes: ex.inlineCss.length, bytes: String(t).length,
    });
  });
  const htmlAnalyzed = analyzeCss(inlineCss);
  const mergeTok = function (x, y) {
    const m = new Map();
    (x || []).forEach(function (i) { m.set(i.value, (m.get(i.value) || 0) + i.count); });
    (y || []).forEach(function (i) { m.set(i.value, (m.get(i.value) || 0) + i.count); });
    return [...m.entries()].map(function (e) { return { value: e[0], count: e[1] }; }).sort(function (p, q) { return q.count - p.count; });
  };
  const tokens = {
    colors: mergeTok(analyzed.colors, htmlAnalyzed.colors).slice(0, 24),
    fonts: mergeTok(analyzed.fonts, htmlAnalyzed.fonts).slice(0, 10),
    radius: mergeTok(analyzed.radius, htmlAnalyzed.radius).slice(0, 12),
    shadows: mergeTok(analyzed.shadows, htmlAnalyzed.shadows).slice(0, 8),
    spacing: mergeTok(analyzed.spacing, htmlAnalyzed.spacing).slice(0, 16),
  };
  const stack = detectStack(htmlFiles.slice(0, 5).map(function (f) { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } }).join(''), deps, rel);
  const first = perPage[0] || {};
  return {
    source: { type: 'dir', value: path.resolve(dir), fetchedAt: new Date().toISOString(), filesScanned: files.length },
    meta: { title: first.title || null, description: first.description || null, lang: first.lang || null },
    techStack: stack,
    routes: perPage.map(function (p) { return p.path; }).slice(0, 60),
    pages: perPage,
    headings: allHeadings,
    sections: sectionsFromHeadings(allHeadings, allButtons),
    copy: { headlines: allHeadings.filter(function (h) { return h.level <= 2; }).map(function (h) { return h.text; }).slice(0, 40), ctas: [...new Set(allButtons)].slice(0, 30) },
    tokens: tokens,
    components: { componentFiles: compFiles.length, htmlFiles: htmlFiles.length, cssFiles: cssFiles.length },
    assets: { images: imgStats.total, imagesMissingAlt: imgStats.missingAlt, imagesMissingSize: imgStats.missingSize, fonts: files.filter(function (f) { return /\.(woff2?|ttf|otf)$/i.test(f); }).length },
    links: [...new Set(allLinks)].slice(0, 120),
    issues: [],
  };
}

function auditProfile(p) {
  const issues = [];
  const t = p.tokens || {};
  if ((t.colors || []).length > 12) issues.push('颜色数量 ' + t.colors.length + ' 种（>12）：缺少系统，建议收敛到 primitive 色阶 + 语义层');
  if ((t.radius || []).length > 3) issues.push('圆角 ' + t.radius.length + ' 种（>3）：圆角无规则（AI 味第 13 条）');
  if ((t.fonts || []).length > 3) issues.push('字体家族 ' + t.fonts.length + ' 个（>3）：字体无纪律且拖慢加载');
  if ((t.shadows || []).length > 3) issues.push('阴影 ' + t.shadows.length + ' 种（>3）：层级表达混乱');
  const a = p.assets || {};
  if (a.imagesMissingAlt) issues.push(a.imagesMissingAlt + ' 张图片缺少 alt');
  if (a.imagesMissingSize) issues.push(a.imagesMissingSize + ' 张图片缺少宽高属性（CLS 风险）');
  const kinds = (p.sections || []).map(function (s) { return s.kind; });
  if (kinds.length && !kinds.includes('proof')) issues.push('未发现信任/证据区（proof）：转化结构可能缺少可信度');
  if (kinds.length && !kinds.includes('pricing') && kinds.includes('features')) issues.push('有特性区但无价格/方案区：用户无法判断成本');
  if ((p.routes || []).length > 40) issues.push('路由数量 ' + p.routes.length + '：信息架构需要梳理');
  return issues;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url && !args.dir) {
    console.error('用法: node ingest_site.mjs --url <url> | --dir <path> [--out site-profile.json]');
    process.exit(2);
  }
  const profile = args.url ? await profileUrl(String(args.url)) : profileDir(String(args.dir));
  profile.issues = auditProfile(profile);
  const json = JSON.stringify(profile, null, 2);
  if (args.out) {
    fs.writeFileSync(String(args.out), json, 'utf8');
    console.log('已写出 ' + args.out);
  }
  const brief = {
    source: profile.source.type,
    techStack: profile.techStack,
    sections: (profile.sections || []).map(function (s) { return s.kind; }),
    topColors: (profile.tokens.colors || []).slice(0, 8),
    fonts: (profile.tokens.fonts || []).slice(0, 4),
    radius: (profile.tokens.radius || []).slice(0, 6),
    issues: profile.issues,
  };
  console.log(JSON.stringify(brief, null, 2));
}

main().catch(function (e) { console.error('画像失败: ' + e.message); process.exit(1); });
