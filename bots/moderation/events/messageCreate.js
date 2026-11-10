'use strict';
const automod = require('../services/automod');

module.exports = {
  event: 'messageCreate',
  run: async (bot, message) => {
    await automod.analyze(bot, message);
    bot.commands.handle(message);
  }
};
