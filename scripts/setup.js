#!/usr/bin/env node
'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { z } = require('zod');

const BOTS = ['guard', 'moderation', 'statistics', 'guildtag', 'register'];
const results = [];
const warnings = [];

function ok(name, msg) { results.push({ name, status: 'OK', msg }); }
function fail(name, msg) { results.push({ name, status: 'FAIL', msg }); }
function warn(name, msg) { warnings.push({ name, msg }); }

(async () => {
  // 1. Node sürümü
  const major = parseInt(process.version.slice(1).split('.')[0], 10);
  if (major >= 18) ok('node', `${process.version}`);
  else fail('node', `${process.version} — 18.17+ gerekli`);

  // 2. .env
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) ok('.env', 'bulundu');
  else {
    fail('.env', 'bulunamadı — .env.example olusturuldu. Doldurup tekrar deneyin.');
    fs.copyFileSync(path.resolve(process.cwd(), '.env.example'), envPath);
  }

  // 3. token kontrolü
  let tokenOK = 0;
  for (const b of BOTS) {
    const tok = process.env[`BOT_TOKEN_${b.toUpperCase()}`];
    if (tok && tok.length > 20 && /^[A-Za-z0-9_-]+$/.test(tok.replace(/\./g, '_'))) ok(`token:${b}`, 'mevcut');
    else fail(`token:${b}`, `BOT_TOKEN_${b.toUpperCase()} eksik / gecersiz`);
  }

  // 4. config dosyaları
  for (const b of BOTS) {
    const p = path.resolve(process.cwd(), 'config', `${b}.js`);
    if (fs.existsSync(p)) {
      try { require(p); ok(`config:${b}`, 'yükledi'); } catch (e) { fail(`config:${b}`, e.message); }
    } else fail(`config:${b}`, 'dosya yok');
  }

  // 5. Mongo
  const uri = process.env.MONGODB_URI;
  if (!uri) fail('mongo', 'MONGODB_URI yok');
  else {
    try {
      const { connectDatabase, disconnectDatabase, pingDatabase } = await require('../shared/database');
      const c = await connectDatabase(uri, () => {});
      const pi = await pingDatabase();
      if (pi.ok) ok('mongo', 'baglandi + ping OK'); else fail('mongo', 'ping failed');
      // index oluşturma (modeller)
      await require('../shared/models');
      await ensureIndexesSafe();
      await disconnectDatabase();
    } catch (e) { fail('mongo', e.message.slice(0, 120)); }
  }

  // 6. Redis ops
  if (process.env.REDIS_URL) {
    try {
      const IORedis = require('ioredis');
      const r = new IORedis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, retryStrategy: () => null, connectTimeout: 5000 });
      await r.connect();
      await r.set('setup-test', '1', 'PX', 30000);
      r.disconnect();
      ok('redis', 'baglandi');
    } catch (e) { warn('redis', `bağlanamadi (${e.message.slice(0, 80)}) — in-memory cache kullanılacak`); }
  } else warn('redis', 'REDIS_URL bos — in-memory cache kullanılacak');

  // 7. token dogrulama (Discord REST)
  for (const b of BOTS) {
    const tok = process.env[`BOT_TOKEN_${b.toUpperCase()}`];
    if (!tok) continue;
    try {
      const res = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: `Bot ${tok}` } });
      if (res.ok) { const j = await res.json(); ok(`discord:${b}`, j.username); tokenOK++; }
      else fail(`discord:${b}`, `HTTP ${res.status}`);
    } catch (e) { warn(`discord:${b}`, `ağ hatasi: ${e.message.slice(0, 60)}`); }
  }

  // 8. Emoji klasör kontrolü
  const ed = path.resolve(process.cwd(), 'emojiler');
  if (fs.existsSync(ed)) {
    const cats = fs.readdirSync(ed, { withFileTypes: true }).filter((d) => d.isDirectory());
    ok('emojiler', cats.length + ' kategoride emoji dosyasi mevcut');
  } else warn('emojiler', 'klasör yok');

  // 9. logs klasörü
  const lg = path.resolve(process.cwd(), 'logs');
  if (!fs.existsSync(lg)) fs.mkdirSync(lg, { recursive: true });
  ok('logs', 'hazır');

  // 10. PM2 config
  if (fs.existsSync(path.resolve(process.cwd(), 'ecosystem.config.js'))) ok('pm2', 'ecosystem.config.js mevcut');
  else fail('pm2', 'ecosystem.config.js yok');

  // 11. komut/event taraması
  for (const b of BOTS) {
    const cd = path.resolve(process.cwd(), 'bots', b, 'commands');
    const ev = path.resolve(process.cwd(), 'bots', b, 'events');
    const c = fs.existsSync(cd) ? collect(cd).length : 0;
    const e = fs.existsSync(ev) ? collect(ev).length : 0;
    if (c > 0) ok(`commands:${b}`, `${c} dosya`); else warn(`commands:${b}`, 'komut yok');
    if (e > 0) ok(`events:${b}`, `${e} dosya`); else warn(`events:${b}`, 'event yok');
  }

  // rapor
  const fails = results.filter((r) => r.status === 'FAIL');
  console.log('\n=========== SETUP SONUC ===========');
  for (const r of results) console.log(`[${r.status}] ${r.name}: ${r.msg}`);
  for (const w of warnings) console.log(`[WARN] ${w.name}: ${w.msg}`);
  console.log(`\nOK: ${results.length - fails.length}  FAIL: ${fails.length}  WARN: ${warnings.length}`);
  if (fails.length) {
    console.log('\nSetup eksik/hatalı. Düzeltip `npm run setup` tekrar çalıştır.');
    process.exit(1);
  } else {
    console.log('\nSetup tamam. Başlatma: `npm run start` (PM2) veya `npm run bot:<name>`');
  }
})().catch((e) => { console.error('Fatal setup hatasi:', e); process.exit(1); });

function collect(dir) {
  const out = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.isDirectory()) out.push(...collect(path.join(dir, f.name)));
    else if (f.name.endsWith('.js')) out.push(f.name);
  }
  return out;
}

async function ensureIndexesSafe() {
  // models'da indexleri kur
  try {
    const models = Object.values(require('../shared/models'));
    for (const m of models) if (m && typeof m.syncIndexes === 'function') await m.syncIndexes();
  } catch { /* idempotent */ }
}
