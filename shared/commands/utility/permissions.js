'use strict';
const { resolveMember } = require('../../utils/resolve');
const { join, is } = require('path');

module.exports = {
  name: 'permissions',
  aliases: ['perm'],
  description: 'Belirtilen kullanıcının kanal/guild izinlerini listeler',
  usage: '.permissions [@kullanici]',
  permission: ['bot-owner', 'guild-owner', 'admin'],
  cooldown: 10,
  async run({ bot, message, args, client }) {
    const member = args[0] ? await resolveMember(client, message.guild, args[0]) : message.member;
    if (!member) return message.reply(`${bot.emoji('error')} Kullanici bulunamadi.`);
    const p = member.permissions;
    const list = [];
    for (const [k, v] of Object.entries(p.serialize())) {
      if (v) list.push(k);
    }
    return message.reply(`**${member.user.tag}** izinleri (${list.length}):\n` + list.sort().join(', ').slice(0, 1800));
  }
};

