import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { collectFontStacks } from './extract_tokens.mjs';

test('单字体多回退只形成一个栈，不宣称已渲染', () => {
  const report = collectFontStacks(':root { --font-body: "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; } body { font-family: var(--font-body); }');
  assert.equal(report.total, 1);
  assert.deepEqual(report.stacks[0].fallbacks, ['Microsoft YaHei', 'system-ui', 'sans-serif']);
  assert.equal(report.renderedVerified, false);
});
test('双角色字体保留两个声明栈', () => {
  const report = collectFontStacks(':root { --font-body: "Body", sans-serif; --font-display: "Display", serif; }');
  assert.equal(report.total, 2);
  assert.deepEqual(report.stacks.map(item => item.primary), ['Body', 'Display']);
});
test('别名变量解析且不重复计数', () => {
  const report = collectFontStacks(':root { --font-body: "Body", sans-serif; --font-heading: var(--font-body); --font-display: var(--font-heading); } h1 { font-family: var(--font-display); }');
  assert.equal(report.total, 1);
  assert.deepEqual(new Set(report.references), new Set(['--font-body', '--font-heading', '--font-display']));
  assert.equal(report.unresolved.length, 0);
});
test('字号、字重、特性变量不冒充家族', () => {
  const report = collectFontStacks(':root { --font-weight: 600; --font-size: 16px; --font-feature-settings: "kern" 1; --weight-title: 600; }');
  assert.equal(report.total, 0);
  assert.equal(report.unresolved.length, 0);
});
test('未定义、循环、损坏声明显式报告，不猜测', () => {
  const report = collectFontStacks(':root { --font-body: var(--font-heading); --font-heading: var(--font-body); } p { font-family: var(--missing); } h2 { font-family: "Unclosed; }');
  assert.equal(report.total, 0);
  assert.ok(report.unresolved.some(item => item.reason.includes('循环')));
  assert.ok(report.unresolved.some(item => item.reason.includes('未定义')));
  assert.ok(report.unresolved.some(item => item.reason.includes('引号')));
});
test('变量回退与含逗号的字体名保持完整', () => {
  const report = collectFontStacks('p { font-family: var(--missing, "Family, Name", sans-serif); }');
  assert.equal(report.total, 1);
  assert.equal(report.stacks[0].primary, 'Family, Name');
  assert.deepEqual(report.stacks[0].fallbacks, ['sans-serif']);
});
test('主题分支保留候选而不冒充最终级联', () => {
  const report = collectFontStacks(':root { --font-body: "A", sans-serif; } .theme { --font-body: "B", serif; } p { font-family: var(--font-body); }');
  assert.equal(report.total, 2);
  assert.equal(report.renderedVerified, false);
});
test('注释不进入字体报告', () => {
  const report = collectFontStacks('/* --font-body: "Fake", serif; */ p { font-family: sans-serif; }');
  assert.equal(report.total, 1);
  assert.deepEqual(report.stacks[0].families, ['sans-serif']);
});
test('平台标识和带引号的泛型名称不混淆', () => {
  const report = collectFontStacks('p { font-family: -apple-system, sans-serif; } h1 { font-family: "serif", sans-serif; } h2 { font-family: serif, sans-serif; }');
  assert.equal(report.total, 3);
  assert.equal(report.unresolved.length, 0);
  assert.deepEqual(report.stacks[1].genericFamilies, ['sans-serif']);
  assert.deepEqual(report.stacks[2].genericFamilies, ['serif', 'sans-serif']);
});
test('CLI 的 --css、--out 与现有报告字段保持兼容', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'font-report-'));
  const css = path.join(dir, 'sample.css'); const output = path.join(dir, 'report.json');
  try {
    fs.writeFileSync(css, ':root { --font-body: "Body", sans-serif; --font-heading: var(--font-body); }');
    const command = spawnSync(process.execPath, [fileURLToPath(new URL('./extract_tokens.mjs', import.meta.url)), '--css', css, '--out', output], { encoding: 'utf8' });
    assert.equal(command.status, 0, command.stderr);
    const report = JSON.parse(fs.readFileSync(output, 'utf8'));
    assert.equal(report.scannedFiles, 1);
    assert.equal(report.fonts.total, 1);
    assert.ok(Array.isArray(report.fonts.top));
    assert.ok(Array.isArray(report.findings));
    const summary = JSON.parse(command.stdout.slice(command.stdout.indexOf('{')));
    assert.equal(summary.fonts, 1);
  } finally {
    if (fs.existsSync(css)) fs.unlinkSync(css);
    if (fs.existsSync(output)) fs.unlinkSync(output);
    fs.rmdirSync(dir);
  }
});
