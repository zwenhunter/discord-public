'use strict';
const { Bot } = require('../../shared/handlers/bot');
const guards = require('./services/guard');

class GuardBot extends Bot {
  constructor() {
    super('guard');
    this.timers = [];
  }

  async postLogin() {
    await this.loadDBGuildEmojis();
    try {
      await guards.loadCounters(this);
      this.timers.push(setInterval(() => {
        guards.flushCounters(this).catch((e) => this.logger.error(`Sayaç kayıt hatası: ${e.message}`));
      }, 60000));
    } catch (e) {
      this.logger.error(`Nuke sayaç sistemi başlatılamadı: ${e.message}`);
    }
  }
}

module.exports = GuardBot;
