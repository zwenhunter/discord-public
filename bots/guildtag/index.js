'use strict';
const { Bot } = require('../../shared/handlers/bot');
const tagSvc = require('./services/tags');

class GuildTagBot extends Bot {
  constructor() {
    super('guildtag');
    this.rafInterval = null;
  }

  async postLogin() {
    await this.loadDBGuildEmojis();
    await tagSvc.syncExisting(this);
    // tag tarama interval
    this.rafInterval = setInterval(() => tagSvc.checkAll(this).catch((e) => this.logger.error(`Tag check: ${e.message}`)), 60000);
  }

  async shutdown(reason) {
    if (this.rafInterval) clearInterval(this.rafInterval);
    await super.shutdown(reason);
  }
}

module.exports = GuildTagBot;
