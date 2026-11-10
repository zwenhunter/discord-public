'use strict';
const regSvc = require('../services/register');

module.exports = {
  event: 'guildMemberAdd',
  run: async (bot, member) => {
    if (member.user.bot) return;
    // kayıtsız rol ver
    if (bot.config.roles.unregistered && member.guild.roles.cache.has(bot.config.roles.unregistered)) {
      await member.roles.add(bot.config.roles.unregistered, 'Kayıtsız otomatik rol').catch(() => {});
    }
    // welcome DM
    if (bot.config.welcome?.enabled) {
      const msg = (bot.config.welcome.message || 'Hoş geldin {user}!').replace('{user}', `<@${member.id}>`).replace('{count}', String(member.guild.memberCount));
      await member.send(msg).catch(() => {});
    }
    await bot.log.log('REGISTER', 'member_join', { userId: member.id });
  }
};
