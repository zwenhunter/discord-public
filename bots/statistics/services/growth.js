'use strict';
const { GuildGrowth } = require('../../../shared/models');

class MemberGrowth {
  constructor(bot, client) {
    this.bot = bot;
    this.client = client;
    this.interval = null;
  }

  start() {
    this.interval = setInterval(() => this.collect().catch(() => {}), this.bot.config.statistics?.memberGrowthIntervalMs ?? 3600000);
    this.collect().catch(() => {});
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  async collect() {
    const guild = this.client.guilds.cache.get(this.bot.guildId);
    if (!guild) return;
    const g = guild;
    const members = g.members.cache;
    const date = new Date().toISOString().slice(0, 10);
    await GuildGrowth.updateOne({ guildId: this.bot.guildId, date }, {
      $set: {
        memberCount: g.memberCount,
        humans: members.filter((m) => !m.user.bot).size,
        bots: members.filter((m) => m.user.bot).size,
        online: members.filter((m) => ['online', 'idle', 'dnd'].includes(m.presence?.status)).size
      }
    }, { upsert: true });
  }
}

module.exports = { MemberGrowth };
