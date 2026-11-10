'use strict';

module.exports = {
  name: 'membercount',
  aliases: ['uyesayisi'],
  description: 'Üye sayısı (cache / API)',
  usage: '.membercount',
  permission: 'everyone',
  cooldown: 3,
  async run({ bot, message }) {
    const g = message.guild;
    const humans = [...g.members.cache.values()].filter((m) => !m.user.bot).length;
    const bots = [...g.members.cache.values()].filter((m) => m.user.bot).length;
    return message.reply(`Uye: **${g.memberCount}** (cache: ${humans} insan / ${bots} bot), kanal: ${g.channels.cache.size}, rol: ${g.roles.cache.size}`);
  }
};
