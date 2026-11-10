'use strict';
const tagSvc = require('../services/tags');

module.exports = {
  event: 'guildMemberRemove',
  run: async (bot, member) => {
    await tagSvc.unbindTag(bot, member.id, 'server-left');
  }
};
