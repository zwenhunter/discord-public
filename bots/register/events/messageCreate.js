'use strict';
const regSvc = require('../services/register');

module.exports = {
  event: 'messageCreate',
  run: async (bot, message) => {
    bot.commands.handle(message);
  }
};
