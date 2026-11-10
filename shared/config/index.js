'use strict';
const path = require('path');
const { z } = require('zod');

const botSchema = z.object({
  prefix: z.string().min(1).default('.'),
  intents: z.array(z.string()).default(['Guilds']),
  permission: z.any().optional(),
  logChannel: z.string().optional(),
  whitelist: z.array(z.string()).default([]),
  botToken: z.string().min(3)
}).catchall(z.unknown());

const envSchema = z.object({
  MONGODB_URI: z.string().url().or(z.string().startsWith('mongodb://')).or(z.string().startsWith('mongodb+srv://'))
}).partial();

// Basit cache: config dosyalari ve token'lari bir kez okur.
const cache = new Map();

function loadBotConfig(botName) {
  const key = `cfg:${botName}`;
  if (cache.has(key)) return cache.get(key);

  const tokenKey = `BOT_TOKEN_${botName.toUpperCase()}`;
  // env/loadEnv hallediyor: token index.js'de process.env'den okunur
  const file = path.resolve(process.cwd(), 'config', `${botName}.js`);
  const raw = require(file);
  const token = process.env[tokenKey];
  if (!token || token.length < 10) {
    throw new Error(`${botName}: ${tokenKey} personel token tanimli degil veya gecersiz. .env dosyasini doldurun.`);
  }
  const cfg = { ...raw, botToken: token, botName };
  const res = botSchema.safeParse(cfg);
  if (!res.success) {
    throw new Error(`${botName} config dogrulamasi Zod hatasi: ${res.error.issues.map((i) => i.message).join(', ')}`);
  }
  cache.set(key, cfg);
  return cfg;
}

function loadGlobalConfig() {
  const key = 'cfg:global';
  if (cache.has(key)) return cache.get(key);
  const file = path.resolve(process.cwd(), 'config', 'global.js');
  const cfg = require(file);
  cache.set(key, cfg);
  return cfg;
}

function invalidateCache() {
  cache.clear();
}

module.exports = { loadBotConfig, loadGlobalConfig, invalidateCache, envSchema };
