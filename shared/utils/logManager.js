'use strict';

/**
 * Log Manager: dosya + Discord log kanali.
 */
const mongoose = require('mongoose');
const { EmbedBuilder } = require('discord.js');
const { redact } = require('../logger');

class LogManager {
  constructor(bot) {
    this.bot = bot;
    this.logger = bot.logger;
  }

  static model() {
    const { GuildLog } = require('../models');
    return GuildLog;
  }

  async log(category, type, data = {}) {
    const safeData = JSON.parse(redact(JSON.stringify(data)));
    try {
      await LogManager.model().create({
        guildId: data.guildId || this.bot.guildId || '',
        bot: this.bot.name,
        category,
        type,
        userId: data.executorId || data.userId || null,
        targetId: data.targetId || null,
        data: safeData
      });
    } catch (err) {
      this.logger.error(`Log MongoDB kayit hatasi: ${err.message}`);
    }
    if (this.bot.logChannel && process.env.LOG_CHANNELS !== 'false') {
      try {
        const { EmbedBuilder } = require('discord.js');
        const emb = new EmbedBuilder()
          .setColor(0x2b2d31)
          .setAuthor({ name: `[${category}] ${type}` })
          .setDescription(redact(JSON.stringify(safeData)).slice(0, 2000))
          .setTimestamp();
        const ch = await this.bot.client.channels.fetch(this.bot.logChannel).catch(() => null);
        if (ch && ch.guildId === this.bot.guildId) await ch.send({ embeds: [emb] }).catch(() => {});
      } catch { /* log gonderilemezse sessiz */ }
    } else {
      this.logger.info(`[${category}] ${type}: ${redact(JSON.stringify(safeData))}`);
    }
  }
}

module.exports = { LogManager, EmbedBuilder };
