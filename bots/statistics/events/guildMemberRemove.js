'use strict';

module.exports = {
  event: 'guildMemberRemove',
  run: async (bot, member) => {
    await bot.log.log('STATISTICS', 'member_leave', { userId: member.id });
    await (bot.growth?.collect?.() || Promise.resolve());
  }
};
