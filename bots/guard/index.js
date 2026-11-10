'use strict';
const { Bot } = require('../../shared/handlers/bot');

class GuardBot extends Bot {
  constructor() {
    super('guard');
    this.timers = [];
  }

  async postLogin() {
    await this.loadDBGuildEmojis();
  }
}

module.exports = GuardBot;
