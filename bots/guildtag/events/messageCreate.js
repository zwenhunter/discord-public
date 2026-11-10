'use strict';
const tagSvc = require('../services/tags');

module.exports = {
  event: 'messageCreate',
  run: async (bot, message) => {
    bot.commands.handle(message);
  }
};
