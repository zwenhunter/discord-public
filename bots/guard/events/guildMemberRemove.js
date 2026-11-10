'use strict';
const guards = require('../services/guard');

module.exports = {
  event: 'guildMemberRemove',
  once: false,
  async run(bot, member) {
    await guards.handleGuildMemberRemove(member);
  }
};
