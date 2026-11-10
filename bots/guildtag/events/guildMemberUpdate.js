'use strict';
const tagSvc = require('../services/tags');

module.exports = {
  event: 'guildMemberUpdate',
  run: async (bot, oldMember, newMember) => {
    // username / displayName change tracking
    if (oldMember.user.username !== newMember.user.username || oldMember.nickname !== newMember.nickname) {
      if (newMember.user.bot) return;
      await tagSvc.checkUser(bot, newMember);
    }
  }
};
