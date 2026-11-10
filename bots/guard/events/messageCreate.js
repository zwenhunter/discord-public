'use strict';
const guards = require('../services/guard');

module.exports = {
  event: 'messageCreate',
  once: false,
  async run(bot, message) {
    await guards.handleMessageCreate(message);
    bot.commands.handle(message);
  }
};
