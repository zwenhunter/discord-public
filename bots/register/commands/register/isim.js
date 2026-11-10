'use strict';
const regSvc = require('../../services/register');
const { ValidationError } = require('../../../../shared/utils/helpers');
const { resolveMember } = require('../../../../shared/utils/resolve');

module.exports = {
  name: 'isim',
  description: 'Kullanıcının ismini değiştirir (kayit sistemi isim)',
  usage: '.isim <kullanici> <yeni-isim> [yas]',
  aliases: ['name', 'nick'],
  permission: ['bot-owner', 'guild-owner', 'admin', 'staff'],
  cooldown: 3,
  async run({ bot, message, args, client }) {
    if (args.length < 2) throw new ValidationError('Kullanim: .isim <kullanici> <yeni-isim> [yas]');
    const { checkStaff } = require('../../services/register');
    if (!(await checkStaff(message.member, bot))) return message.reply(`${bot.emoji('error')} Yetkili değilsin.`);
    const member = await resolveMember(client, message.guild, args[0]);
    if (!member) return message.reply(`${bot.emoji('error')} Kullanici bulunamadi.`);
    const { name, age } = regSvc.nameAge(args.slice(1).join(' '));
    if (!name) return message.reply(`${bot.emoji('error')} İsim belirtilmeli.`);
    if (age != null && (age < (bot.config.names?.minAge || 0) || age > (bot.config.names?.maxAge || 99))) return message.reply(`${bot.emoji('error')} Yas aralık dışı.`);
    await member.setNickname(`${name}${age ? ' | ' + age : ''}`, `isim değişikliği ${message.author.tag}`);
    return message.reply(`${bot.emoji('success')} İsim güncellendi: ${name}${age ? ' | ' + age : ''}`);
  }
};

