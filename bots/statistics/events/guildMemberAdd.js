'use strict';
const { GuildGrowth } = require('../../../shared/models');

module.exports = {
  event: 'guildMemberAdd',
  run: async (bot, member) => {
    await bot.log.log('STATISTICS', 'member_join', { userId: member.id });
    await (bot.growth?.collect?.() || Promise.resolve());
  }
};
