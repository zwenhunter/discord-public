'use strict';

module.exports = {
  name: 'trustrole',
  aliases: ['govenilirrol'],
  description: 'Guard trusted role ekleme/cikarma',
  usage: '.trustrole <ekle|cikar|liste> [rolID]',
  permission: ['bot-owner', 'guild-owner'],
  cooldown: 5,
  async run({ bot, message, args }) {
    const tr = bot.config.trustedRoles;
    const action = (args[0] || 'liste').toLowerCase();
    if (action === 'liste') return message.reply(`${bot.emoji('info')} Trusted roles: ${tr.join(', ') || 'bos'}`);
    const id = args[1]?.replace(/[^0-9]/g, '');
    if (!id) return message.reply(`${bot.emoji('error')} Rol ID gir.`);
    if ((action === 'ekle' || action === 'add') && !tr.includes(id)) tr.push(id);
    if ((action === 'cikar' || action === 'remove')) { const i = tr.indexOf(id); if (i > -1) tr.splice(i, 1); }
    return message.reply(`${bot.emoji('success')} Trusted roles: ${tr.join(', ')}`);
  }
};
