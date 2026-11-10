'use strict';
const tagSvc = require('../../services/tags');
const { Tag, TagUser } = require('../../../../shared/models');
const { ValidationError } = require('../../../../shared/utils/helpers');
const { resolveMember } = require('../../../../shared/utils/resolve');

module.exports = {
  name: 'tagvar',
  aliases: ['tag-control'],
  description: 'Bir kullanıcının tagına force-check yapar',
  usage: '.tagvar <kullanici>',
  permission: ['bot-owner', 'guild-owner', 'admin', 'staff'],
  cooldown: 5,
  async run({ bot, message, args, client }) {
    if (!args[0]) throw new ValidationError('.tagvar <kullanici>');
    const member = await resolveMember(client, message.guild, args[0]);
    if (!member) return message.reply(`${bot.emoji('error')} Kullanici bulunamadi.`);
    const result = await tagSvc.checkUser(bot, member);
    if (!result) return message.reply(`${bot.emoji('info')} Tag degişikliği yok.`);
    if (result.action === 'join') return message.reply(`${bot.emoji('success')} **${member.user.tag}** \`${result.tag}\` tagına eklendi.`);
    if (result.action === 'left') return message.reply(`${bot.emoji('success')} **${member.user.tag}** \`${result.tag}\` tagından çıkarıldı.`);
    return message.reply(`${bot.emoji('info')} Zaten \`${result.tag}\` taglı.`);
  }
};

