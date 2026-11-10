'use strict';
const { resolveMember } = require('../../utils/resolve');

module.exports = {
  name: 'id',
  description: 'Kullanıcı ID sorgu (herhangi bir mention ya da username)',
  usage: '.id [@kullanici]',
  permission: 'everyone',
  cooldown: 3,
  async run({ bot, message, args, client }) {
    const member = args[0] ? await resolveMember(client, message.guild, args[0]) : message.member;
    if (!member) return message.reply(`${bot.emoji('error')} Kullanici bulunamadi.`);
    return message.reply(`**${member.user.tag}** \u2192 \`${member.id}\``);
  }
};
