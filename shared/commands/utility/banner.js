'use strict';
const { resolveMember } = require('../../utils/resolve');

module.exports = {
  name: 'banner',
  description: 'Kullanıcının bannerını gösterir',
  usage: '.banner [@kullanici]',
  permission: 'everyone',
  cooldown: 3,
  async run({ bot, message, args, client }) {
    const member = args[0] ? await resolveMember(client, message.guild, args[0]) : message.member;
    if (!member) return message.reply(`${bot.emoji('error')} Kullanici bulunamadi.`);
    const user = await client.users.fetch(member.id).catch(() => null);
    if (!user || !user.bannerURL()) return message.reply(`${bot.emoji('info')} Banner yok.`);
    return message.reply(user.bannerURL({ size: 1024 }));
  }
};
