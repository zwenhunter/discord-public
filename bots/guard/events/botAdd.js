'use strict';
const guards = require('../services/guard');

module.exports = {
  event: 'guildMemberAdd',
  once: false,
  async run(bot, member) {
    if (member.user.bot) {
      await guards.handleBotAdd(member);
    }
  }
};
