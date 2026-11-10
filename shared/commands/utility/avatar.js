'use strict';
const { resolveMember } = require('../../utils/resolve');

module.exports = {
  name: 'avatar',
  aliases: ['pp', 'resim'],
  description: 'Kullanıcının avatarını gösterir',
  usage: '.avatar [@kullanici]',
  permission: 'everyone',
  cooldown: 3,
  async run({ bot, message, args, client }) {
    const member = args[0] ? await resolveMember(client, message.guild, args[0]) : message.member;
    if (!member) return message.reply(`${bot.emoji('error')} Kullanici bulunamadi.`);
    return message.reply(member.user.displayAvatarURL({ size: 1024 }));
  }
};
