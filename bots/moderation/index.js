'use strict';
const fs = require('fs');
const path = require('path');
const { Bot } = require('../../shared/handlers/bot');
const moderationSvc = require('./services/moderation');
const { SentenceScheduler } = require('./services/scheduler');

class ModerationBot extends Bot {
  constructor() {
    super('moderation');
    this.timers = [];
    this.scheduler = null;
  }

  async postLogin() {
    this.scheduler = new SentenceScheduler(this, this.client);
    this.scheduler.start();
    await this.loadDBGuildEmojis();
  }

  async shutdown(reason) {
    if (this.scheduler) this.scheduler.stop();
    await super.shutdown(reason);
  }
}

module.exports = ModerationBot;
