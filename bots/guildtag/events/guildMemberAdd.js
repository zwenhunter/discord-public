'use strict';
const tagSvc = require('../services/tags');

module.exports = {
  event: 'guildMemberAdd',
  run: async (bot, member) => {
    if (!member.user.bot) {
      await tagSvc.checkUser(bot, member);
    }
  }
};
