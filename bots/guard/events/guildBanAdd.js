'use strict';
const guards = require('../services/guard');

module.exports = {
  event: 'guildBanAdd',
  once: false,
  async run(bot, ban) {
    await guards.handleGuildBanAdd(ban);
  }
};
