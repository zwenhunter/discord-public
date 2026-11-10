'use strict';
const { StatisticsService } = require('../services/statistics');

module.exports = {
  event: 'messageCreate',
  run: async (bot, message) => {
    await bot.service.handleMessage(message);
    bot.commands.handle(message);
  }
};
