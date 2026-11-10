'use strict';
const guards = require('../services/guard');

module.exports = {
  event: 'guildMemberAdd',
  once: false,
  async run(bot, member) {
    await guards.handleGuildMemberAdd(member);
  }
};
