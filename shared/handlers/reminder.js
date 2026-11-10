'use strict';
const { Remind } = require('../models');

class ReminderService {
  constructor(bot) {
    this.bot = bot;
    this.interval = null;
  }
  start() {
    this.interval = setInterval(() => this.tick().catch((e) => this.bot.logger.debug(`Remind tick: ${e.message}`)), 30000);
  }
  stop() {
    if (this.interval) clearInterval(this.interval);
  }
  async tick() {
    if (this.bot.client.readyAt == null) return;
    const due = await Remind.find({ sent: false, dueAt: { $lte: new Date() } }).limit(20);
    for (const r of due) {
      r.sent = true;
      await r.save();
      const ch = await this.bot.client.channels.fetch(r.channelId).catch(() => null);
      if (ch) await ch.send(`${this.bot.emoji('info')} <@${r.userId}> hatırlatma: ${r.text}`).catch(() => {});
    }
  }
}

module.exports = { ReminderService };
