'use strict';
const { Case } = require('../../../shared/models');
const { humanizeDuration } = require('../../../shared/utils/resolve');

/**
 * Süreli cezalan (tempban/tempmute/tempjail/tempmute) restart'tan sonra da calismaya devam etsin:
 * her 30 sn'de expiresAt'i gecmis aktif cezaları DB'den cekip cozer.
 */
class SentenceScheduler {
  constructor(bot, client) {
    this.bot = bot;
    this.client = client;
    this.interval = null;
    this.inFlight = new Set();
  }

  start() {
    this.interval = setInterval(() => {
      this.tick().catch((e) => this.bot.logger.error(`Scheduler tick hata: ${e.message}`));
    }, 30000);
    this.tick().catch(() => {});
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  async tick() {
    if (this.client.readyAt == null) return;
    const expired = await Case.find({ guildId: this.bot.guildId, active: true, durationMs: { $gt: 0 }, expiresAt: { $ne: null, $lte: new Date() } }).limit(50).lean();
    for (const c of expired) {
      if (this.inFlight.has(String(c._id))) continue;
      this.inFlight.add(String(c._id));
      try {
        await this.resolve(c);
      } finally {
        this.inFlight.delete(String(c._id));
      }
    }
  }

  async resolve(c) {
    const guild = this.client.guilds.cache.get(this.bot.guildId);
    if (!guild) return;
    const multi = { delay: 500 };
    switch (c.type) {
      case 'tempban': {
        // tempban: unban yap
        try { await guild.members.unban(c.targetUserId, `Tempban süresi doldu - case ${c.caseId}`); } catch { /* halledildi */ }
        break;
      }
      case 'tempmute':
      case 'tempjail': {
        try {
          const member = await guild.members.fetch(c.targetUserId).catch(() => null);
          if (member) {
            if (c.type === 'tempmute') {
              const muteRole = guild.roles.cache.get(this.bot.config.publicMuteRole || this.bot.config.tempMuteRole);
              if (muteRole) await member.roles.remove(muteRole);
              else if (member.moderatable) await member.timeout(0);
            } else {
              const jailRoles = this.bot.config.jailRoles || [];
              for (const r of c.data?.removedRoles || []) await member.roles.add(r).catch(() => {});
            }
          }
        } catch { /* halledildi */ }
        break;
      }
      case 'timeout': {
        try {
          const member = await guild.members.fetch(c.targetUserId).catch(() => null);
          if (member && member.moderatable) await member.timeout(0);
        } catch { /* halledildi */ }
        break;
      }
      default:
        break;
    }
    await Case.updateOne({ _id: c._id }, { $set: { active: false, resolvedAt: new Date(), resolvedBy: 'scheduler' } });
    await this.bot.log.log('MODERATION', 'auto_expire', { caseId: c.caseId, targetUserId: c.targetUserId, type: c.type });
  }
}

module.exports = { SentenceScheduler };
