'use strict';
const { MessageStat, VoiceStat, MemberStat, GuildGrowth } = require('../../../shared/models');

/**
 * Incremental统计分析 mesajlar (bulkWrite) + membership aidatlar.
 * Webhook / bot messages excluded.
 */
class StatisticsService {
  constructor(bot, client) {
    this.bot = bot;
    this.client = client;
    this.inverval = null;
    this.messageBuffer = []; // {guild, user, channel, date}
    this.date = new Date().toISOString().slice(0, 10);
    this.excludeChannels = bot.config.channels?.excludeStatChannelIds || [];
  }

  start() {
    this.interval = setInterval(() => this.flush(), 10000);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  dateStr() {
    return new Date().toISOString().slice(0, 10);
  }

  async handleMessage(message) {
    if (message.author.bot) return;
    if (message.webhookId) return;
    if (this.excludeChannels.includes(message.channel.id)) return;
    if (message.guild?.id !== this.bot.guildId) return;
    this.messageBuffer.push({ guildId: this.bot.guildId, userId: message.author.id, channelId: message.channel.id, date: this.dateStr() });
    if (this.messageBuffer.length >= 500) await this.flush();
  }

  async flush() {
    if (!this.messageBuffer.length) return;
    const buf = this.messageBuffer.splice(0, this.messageBuffer.length);
    const ops = new Map();
    for (const m of buf) {
      const key = `${m.userId}:${m.channelId}:${m.date}`;
      const op = ops.get(key) || {
        updateOne: {
          filter: { guildId: m.guildId, userId: m.userId, channelId: m.channelId, date: m.date },
          update: { $inc: { count: 1 } },
          upsert: true
        }
      };
      if (!ops.has(key)) ops.set(key, op); // one node
    }
    // add statistics per member counter
    const memberOps = new Map();
    for (const m of buf) {
      const op = memberOps.get(m.userId) || {
        updateOne: {
          filter: { guildId: m.guildId, userId: m.userId },
          update: { $inc: { messages: 1 } },
          upsert: true
        }
      };
      if (!memberOps.has(m.userId)) memberOps.set(m.userId, op);
    }
    const { mongoose } = require('mongoose');
    await MessageStat.bulkWrite([...ops.values()], { ordered: false }).catch((e) => this.bot.logger.error(`MessageStat bulkWrite: ${e.message}`));
    await MemberStat.bulkWrite([...memberOps.values()], { ordered: false }).catch((e) => this.bot.logger.error(`MemberStat bulkWrite: ${e.message}`));
  }
}

module.exports = { StatisticsService };
