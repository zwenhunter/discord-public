'use strict';
const { Bot } = require('../../shared/handlers/bot');
const { StatisticsService } = require('./services/statistics');
const { VoiceTracker } = require('./services/voicetracker');
const { MemberGrowth } = require('./services/growth');

class StatisticsBot extends Bot {
  constructor() {
    super('statistics');
    this.timers = [];
  }

  async postLogin() {
    await this.loadDBGuildEmojis();
    this.service = new StatisticsService(this, this.client);
    this.voiceTracker = new VoiceTracker(this, this.client);
    this.growth = new MemberGrowth(this, this.client);
    this.service.start();
    this.voiceTracker.start();
    this.growth.start();
  }

  async shutdown(reason) {
    this.service?.stop();
    this.voiceTracker?.stop();
    this.growth?.stop();
    await super.shutdown(reason);
  }
}

module.exports = StatisticsBot;
