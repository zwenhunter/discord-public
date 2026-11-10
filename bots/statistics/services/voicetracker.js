'use strict';
const { VoiceStat, MemberStat } = require('../../../shared/models');

/**
 * VoiceTracker: Hibernate - user ses kanalına gir-çık zamanlarina göre
 * VoiceStat'a yazar. AFK kanalındaki süreler sayilmez.
 */
class VoiceTracker {
  constructor(bot, client) {
    this.bot = bot;
    this.client = client;
    this.joined = new Map(); // userId -> { channelId, joinedAt }
    this.bot.config.afkChannelId = bot.config.afkChannelId || '';
  }

  start() {
    // restart sonrasi voice'da olan kullanicilari baslat
    interval_active();
  }

  stop() {
    for (const [userId, info] of this.joined) {
      this.commit(userId, info.channelId, info.joinedAt, Date.now()).catch(() => {});
    }
    this.joined.clear();
  }

  dateStr(d) {
    return (d || new Date()).toISOString().slice(0, 10);
  }

  isAfk(channelId) {
    if (!this.bot.config.statistics) return false;
    return channelId === this.bot.config.afkChannelId;
  }

  async commit(userId, channelId, joinedAt, leftAt) {
    if (this.isAfk(channelId)) return;
    const total = Math.max(0, Math.floor((leftAt - joinedAt) / 1000));
    if (total < 1) return;
    // gun bolumlerine ayır (gece yarısı geçişi)
    const chunks = [];
    let cur = joinedAt;
    while (cur < leftAt) {
      const end = Math.min(new Date(new Date(cur).setHours(24, 0, 0, 0)).getTime(), leftAt);
      chunks.push({ date: this.dateStr(new Date(cur)), seconds: Math.floor((end - cur) / 1000) });
      cur = end;
    }
    for (const c of chunks) {
      const { mongoose } = require('mongoose');
      await VoiceStat.updateOne({ guildId: this.bot.guildId, userId, date: c.date, channelId }, { $inc: { seconds: c.seconds } }, { upsert: true });
      await MemberStat.updateOne({ guildId: this.bot.guildId, userId }, { $inc: { voiceSeconds: c.seconds } }, { upsert: true });
    }
  }

  async handleStateChange(oldState, newState) {
    const userId = newState.id;
    const guildId = newState.guild.id === this.bot.guildId;
    if (!guildId) return;

    // left
    if (oldState.channelId && this.joined.has(userId)) {
      const info = this.joined.get(userId);
      // aynı kişi yeni kanala geçti ise de süre hesapla
      await this.commit(userId, info.channelId, info.joinedAt, Date.now());
      this.joined.delete(userId);
    }
    // join
    if (newState.channelId) {
      // self-deaf: sayınsesi
      if (newState.selfDeaf || newState.serverDeaf) {
        // AFK aslı sayılmaz
        return;
      }
      this.joined.set(userId, { channelId: newState.channelId, joinedAt: Date.now() });
    }
  }
}

function interval_active() {
  // no-op: state-based tracker, no polling
}

module.exports = { VoiceTracker };
