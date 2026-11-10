#!/usr/bin/env node
'use strict';
/**
 * Lightweight syntax/lint checker:
 * - node --check her dosya
 * - basit custom kurallar: TODO/FIXME kontrolu, console.error vs (skip), unused-var-declaration detection yok (minimal).
 */
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) {
      if (['node_modules', 'logs', 'coverage'].includes(f.name)) continue;
      out.push(...walk(p));
    }
    else if (f.name.endsWith('.js')) out.push(p);
  }
  return out;
}

(async () => {
  const files = [...walk('bots'), ...walk('shared'), ...walk('scripts')];
  let errors = 0;
  for (const f of files) {
    await new Promise((res) => execFile('node', ['--check', f], (err) => { if (err) { errors++; console.error(`SYNTAX: ${f}`); } res(); }));
    const src = fs.readFileSync(f, 'utf8');
    if (/TODO|FIXME/i.test(src)) {
      console.warn(`WARN todo/fixme: ${f}`);
    }
    if (/\/\*\*?[^]*?process\.env\.TOKEN_/.test(src)) { /* no-op */ }
  }
  console.log(`Checked ${files.length} files, ${errors} syntax errors`);
  process.exit(errors > 0 ? 1 : 0);
})();
