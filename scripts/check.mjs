import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'shots', 'reports'].includes(entry.name)) continue;
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(target); else files.push(target);
  }
}
walk(root);
const entry = fs.readFileSync(path.join(root, 'frontend-studio/SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
if (!entry.startsWith('---\n') || !/^name: frontend-studio$/m.test(entry) || !/^description: .+/m.test(entry)) errors.push('Missing skill metadata');
for (const file of files) {
  if (file.endsWith('.md')) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(/!?\[[^\]]*\]\(([^\s)]+)\)/g)) {
      const link = match[1];
      if (/^(?:[a-z]+:|#)/i.test(link)) continue;
      const target = path.resolve(path.dirname(file), decodeURIComponent(link.split('#')[0]));
      if (!target.startsWith(root + path.sep) || !fs.existsSync(target)) errors.push(`Broken local resource: ${path.relative(root, file)} -> ${link}`);
    }
  }
  if (/\.(?:mjs|js)$/.test(file)) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) errors.push(result.stderr);
  }
}
const audit = spawnSync(process.execPath, ['frontend-studio/scripts/audit_ui.mjs', '--dir', 'frontend-studio/assets'], { cwd: root, encoding: 'utf8' });
try {
  if (audit.status !== 0) throw new Error(audit.stderr);
  const report = JSON.parse(audit.stdout);
  if (report.bySeverity['阻断'] || report.bySeverity['高']) errors.push('Sample audit has blocker/high findings');
  console.log(`Static asset audit: ${report.files} files, ${report.issues} findings`);
} catch (error) { errors.push(`Audit failed: ${error.message}`); }
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Package check passed: ${files.length} files, local Markdown resources and JavaScript syntax checked`);
