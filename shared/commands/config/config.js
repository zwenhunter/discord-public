'use strict';
const { EmojiRegistry, GuildSettings, Startup } = require('../../models');

module.exports = {
  name: 'config',
  description: 'Bot config görüntüleme / güncelleme (mongo ayarları)',
  usage: '.config <goster|prefix> [deger]',
  permission: ['bot-owner', 'guild-owner', 'admin'],
  cooldown: 3,
  async run({ bot, message, args }) {
    const action = args[0] || 'goster';
    const guildSettings = await GuildSettings.findOne({ guildId: bot.guildId }).lean();
    if (action === 'goster' || action === 'show') {
      const cfg = bot.config;
      const keys = Object.keys(cfg).filter((k) => !/token/i.test(k) && !/Token/.test(k));
      const redacted = {};
      for (const k of keys) redacted[k] = typeof cfg[k] === 'object' ? JSON.stringify(cfg[k]).slice(0, 300) : cfg[k];
      return message.reply([
        `**${bot.name} config** (env: mongo=OK redis=${bot.global.redisUrl ? 'OK' : 'yok'}, guild=${bot.guildId ? bot.guildId : 'yok'})`,
        '```json',
        JSON.stringify(redacted, null, 2),
        '```'
      ].join('\n').slice(0, 1950));
    }
    if (action === 'prefix') {
      const prefix = args[1];
      if (!prefix) return message.reply(`${bot.emoji('error')} Prefix gir.`);
      if (prefix.length > 3) return message.reply(`${bot.emoji('error')} Prefix max 3 karakter.`);
      await GuildSettings.updateOne({ guildId: bot.guildId }, { $set: { prefix } }, { upsert: true });
      bot.config.prefix = prefix;
      bot.client.ecosystem.config.prefix = prefix;
      return message.reply(`${bot.emoji('success')} Prefix ayarlandı: \`${prefix}\``);
    }
    return message.reply(`${bot.emoji('error')} Kullanim: .config <goster|prefix> [deger]`);
  }
};

