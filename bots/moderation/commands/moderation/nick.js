'use strict';
const { resolveMember } = require('../../../../shared/utils/resolve');
const { ValidationError } = require('../../../../shared/utils/helpers');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'nick',
  aliases: ['isim-'],
  description: 'Kullanıcının ismini değiştir',
  usage: '.nick <kullanici> <yeni-isim>',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin'],
  cooldown: 3,
  async run({ bot, message, args, client }) {
    if (args.length < 2) throw new ValidationError('Eksik arguman.', '.nick <kullanici> <yeni-isim>');
    const member = await resolveMember(client, message.guild, args[0]);
    if (!member) throw new ValidationError('Kullanici bulunamadi.');
    const { modInvalidHier } = require('../../services/moderation');
    if (modInvalidHier(bot, message.guild, message.member, member)) throw new ValidationError('Hedef senden üst rolde.');
    const name = args.slice(1).join(' ').slice(0, 32);
    await member.setNickname(name, `nick ${message.author.tag}`);
    return message.reply(`${bot.emoji('success')} Nick değiştirildi: **${name}**`);
  }
};

