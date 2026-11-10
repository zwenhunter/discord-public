'use strict';
const { resolveRole } = require('../../utils/resolve');

module.exports = {
  name: 'inrole',
  alias: ['rol-uyeler'],
  aliases: ['roli-uyeler'],
  description: 'Belirli roldeki üyeleri listeler',
  usage: '.inrole <rol>',
  permission: 'everyone',
  cooldown: 10,
  async run({ bot, message, args }) {
    const role = resolveRole(message.guild, args[0]);
    if (!role) return message.reply(`${bot.emoji('error')} Rol bulunamadi.`);
    if (role.members.size > 50) return message.reply(`${bot.emoji('info')} ${role.members.size} üye: çok fazla (50+).`);
    return message.reply(`${role.members.size} üye:\n${role.members.map((m) => `<@${m.id}>`).join(', ')}`);
  }
};
