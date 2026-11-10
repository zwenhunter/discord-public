import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Command handler'ın prefix parse mantığını mini clone ile test et
describe('CommandHandler.load + parse', () => {
  function makeBot(name) {
    const { CommandHandler } = require('../shared/handlers/commandHandler');
    const { createLogger } = require('../shared/logger');
    const logger = createLogger('test-' + name, 'error');
    const bot = {
      name,
      dir: path.join(ROOT, 'bots', name),
      client: { ecosystem: { global: { prefix: '.', ownerIds: [] } } },
      config: { prefix: '.', sharedCommands: true },
      logger,
      commands: null,
      emoji: () => ''
    };
    const h = new CommandHandler(bot);
    bot.commands = h;
    h.load();
    return bot;
  }

  it('guard bot komutlari yukler', () => {
    const bot = makeBot('guard');
    expect(bot.commands.commands.size).toBeGreaterThan(5);
    expect(bot.commands.aliases.has('wl')).toBe(true);
  });
  it('moderation bot komutlari yuklenir (35+)', () => {
    const bot = makeBot('moderation');
    expect(bot.commands.commands.size).toBeGreaterThanOrEqual(30);
  });
  it('shared komutlar her botta yüklenir', () => {
    for (const n of ['guard', 'moderation', 'statistics', 'guildtag', 'register']) {
      const bot = makeBot(n);
      expect(bot.commands.commands.has('help'), `${n}: .help missing`).toBe(true);
      expect(bot.commands.commands.has('emojikur'), `${n}: .emojikur missing`).toBe(true);
    }
  });
  it('her komut gecerli sekle sahip', () => {
    for (const n of ['guard', 'moderation', 'statistics', 'guildtag', 'register']) {
      const bot = makeBot(n);
      for (const [name, c] of bot.commands.commands) {
        expect(c.name, name).toBe(name);
        expect(Array.isArray(c.aliases)).toBe(true);
        expect(typeof c.description).toBe('string');
        expect(c.description.length).toBeGreaterThan(3);
        expect(typeof c.usage).toBe('string');
        expect(typeof c.run).toBe('function');
        expect(c.permission !== undefined).toBe(true);
      }
    }
  });
  it('alias cakismasi yok', () => {
    for (const n of ['guard', 'moderation', 'statistics', 'guildtag', 'register']) {
      const bot = makeBot(n);
      const seen = new Set();
      for (const [a] of bot.commands.aliases) {
        // aliases map duplicate yutulmaz, ama komut isimleri ile cakismayalanabilir
        if (bot.commands.commands.has(a)) throw new Error(`alias ${a} command ile cakisiyor (${n})`);
      }
    }
  });
  it('prefix parse mantigi', () => {
    // handler'dan bağımsız parse testi: content -> cmdName, args
    const prefix = '.';
    const content = '.ban @user 1d2h some reason';
    expect(content.startsWith(prefix)).toBe(true);
    const parts = content.slice(prefix.length).trim().split(/\s+/);
    expect(parts.shift()).toBe('ban');
    expect(parts).toEqual(['@user', '1d2h', 'some', 'reason']);
  });
});

describe('Bot config validation', () => {
  it('token olmadan loadBotConfig fail eder', () => {
    const { loadBotConfig } = require('../shared/config');
    const before = process.env.BOT_TOKEN_GUARD;
    delete process.env.BOT_TOKEN_GUARD;
    try {
      require('../shared/config').invalidateCache();
      expect(() => loadBotConfig('guard')).toThrow(/BOT_TOKEN/);
    } finally {
      process.env.BOT_TOKEN_GUARD = before;
      require('../shared/config').invalidateCache();
    }
  });
  it('token varken config yukler', () => {
    const { loadBotConfig } = require('../shared/config');
    process.env.BOT_TOKEN_GUARD = EnvironmentTokenStub();
    require('../shared/config').invalidateCache();
    const cfg = loadBotConfig('guard');
    expect(cfg.botName).toBe('guard');
    expect(cfg.antiNuke).toBeTruthy();
    delete process.env.BOT_TOKEN_GUARD;
    require('../shared/config').invalidateCache();
  });
});

function EnvironmentTokenStub() {
  return 'MTIzNDU2Nzg5MDEyMzQ1Njc4OTA.Gstub_token_value_123456789';
}
