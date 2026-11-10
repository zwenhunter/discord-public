'use strict';

/**
 * Bot bootstrap: her bot icin ortak iskelet.
 * - config + token validate
 * - database / cache init (bir kez, shared)
 * - command + event yukleme
 * - client login
 * - graceful shutdown
 */
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const path = require('path');
const { createLogger } = require('../logger');
const { loadBotConfig, loadGlobalConfig } = require('../config');
const { connectDatabase, disconnectDatabase } = require('../database');
const { CacheManager } = require('../cache');
const { CommandHandler } = require('../handlers/commandHandler');
const { EventHandler } = require('../handlers/eventHandler');
const { EmojiManager } = require('../emoji');
const { LogManager } = require('../utils/logManager');
const { ReminderService } = require('./reminder');
const { ValidationError } = require('../utils/helpers');

const INTENTS_MAP = {
  Guilds: GatewayIntentBits.Guilds,
  GuildMembers: GatewayIntentBits.GuildMembers,
  GuildMessages: GatewayIntentBits.GuildMessages,
  GuildVoiceStates: GatewayIntentBits.GuildVoiceStates,
  MessageContent: GatewayIntentBits.MessageContent,
  GuildModeration: GatewayIntentBits.GuildModeration,
  GuildEmojisAndStickers: GatewayIntentBits.GuildEmojisAndStickers,
  GuildInvites: GatewayIntentBits.GuildInvites
};

let dbShared = null;
let cacheShared = null;

class Bot {
  constructor(name, callbacks = {}) {
    this.name = name;
    this.dir = path.resolve(process.cwd(), 'bots', name);
    this.config = loadBotConfig(name);
    this.guildId = process.env.GUILD_ID || '';
    this.global = loadGlobalConfig();
    this.logger = createLogger(name, (this.global.logs && this.global.logs.fileLevel) || 'info');
    this.emojiFallback = callbacks.emojiFallback || (() => '');
    this.client = new Client({
      intents: (this.config.intents || ['Guilds']).map((i) => INTENTS_MAP[i]).filter(Boolean),
      partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.GuildMember]
    });
    this.client.ecosystem = {
      bot: this,
      global: this.global,
      config: this.config,
      emoji: (k) => this.emoji(k),
      emojiStr: (k) => this.emoji(k),
      safeMember: async (guild, id) => {
        try {
          return await guild.members.fetch(id);
        } catch {
          try { return await guild.members.fetch({ user: id, force: true }); } catch { return null; }
        }
      }
    };
    this.commands = new CommandHandler(this);
    this.events = new EventHandler(this);
    this.logChannel = this.config.logChannel || '';
    this.log = new LogManager(this);
    this.cache = null;
    this.emojiManager = new EmojiManager();
  }

  emoji(key) {
    if (this.emojiKeyToDiscord) {
      const e = this.emojiKeyToDiscord.get(key);
      if (e) return e.toString();
    }
    return this.emojiFallback(key) || '»';
  }

  async db() {
    if (!dbShared) dbShared = await connectDatabase(this.global.mongoUri, this.logger);
    return dbShared;
  }

  async cacheInit() {
    if (!cacheShared) cacheShared = new CacheManager(this.global.redisUrl, this.logger);
    return cacheShared;
  }

  get cache() {
    return cacheShared;
  }

  async start() {
    // 1. DB (data store)
    this.logger.info(`${this.name} baslatiliyor...`);
    await this.db();
    this.cacheInit();

    // 2. Komut / Event yukle
    const cmds = this.commands.load();
    this.events.load();
    if (this.config.sharedCommands) {
      this.reminder = new ReminderService(this);
      this.reminder.start();
    }

    // 3. Special bot init
    if (typeof this.preLogin === 'function') await this.preLogin();

    // 4. Login (token must be valid)
    await this.client.login(this.config.botToken);
    this.logger.info(`Logged in as ${this.client.user.tag}`);

    if (typeof this.postLogin === 'function') await this.postLogin(cmds);
    const { Startup } = require('../models');
    await Startup.create({ bot: this.name, guildId: this.guildId, version: require(path.resolve(process.cwd(), 'package.json')).version }).catch(() => {});
    return this;
  }

  async loadDBGuildEmojis() {
    const { EmojiRegistry } = require('../models');
    if (!this.guildId) return;
    const docs = await EmojiRegistry.find({ guildId: this.guildId });
    this.emojiKeyToDiscord = new Map();
    this.emojiDiscordToKey = new Map();
    for (const doc of docs) {
      const e = this.client.guilds.cache.get(this.guildId)?.emojis.cache.get(doc.emojiId);
      if (e) {
        this.emojiKeyToDiscord.set(doc.key, e);
        this.emojiDiscordToKey.set(e.id, doc.key);
      }
    }
    this.emojiManager.cacheLoaded(this.emojiDiscordToKey, this.emojiKeyToDiscord);
  }

  async shutdown(reason) {
    this.logger.warn(`Graceful shutdown: ${reason}`);
    this.reminder?.stop();
    // scheduled timers clear
    if (this.timers && Array.isArray(this.timers)) {
      for (const t of this.timers) clearInterval(t);
      this.timers.length = 0;
    }
    await this.client.destroy();
    await disconnectDatabase().catch(() => {});
    process.exit(0);
  }

  registerShutdown() {
    let shuttingDown = false;
    const handler = (signal) => async () => {
      if (shuttingDown) return;
      shuttingDown = true;
      await this.shutdown(signal);
    };
    process.on('SIGINT', handler('SIGINT'));
    process.on('SIGTERM', handler('SIGTERM'));
    process.on('unhandledRejection', (reason) => {
      this.logger.error(`Unhandled rejection: ${reason && reason.stack ? reason.stack : reason}`);
    });
    process.on('uncaughtException', (err) => {
      this.logger.error(`Uncaught exception: ${err.stack || err.message}`);
    });
  }
}

module.exports = { Bot, ValidationError };
