'use strict';
const regSvc = require('../../services/register');
const { ValidationError } = require('../../../../shared/utils/helpers');

module.exports = {
  name: 'register',
  description: 'Kayıt yap (erkek)',
  usage: '.register <kullanici> <isim> [yas]',
  aliases: ['kayıt', 'erkek'],
  permission: ['bot-owner', 'guild-owner', 'admin', 'staff'],
  cooldown: 3,
  async run({ bot, message, args, client }) {
    if (args.length < 2) throw new ValidationError('Kullanim: .register <kullanici> <isim> [yas]');
    const member = args[0];
    const name = args.slice(1).join(' ');
    // staff kontrol
    const staffPerms = await regSvc.checkStaff(message.member, bot);
    if (!staffPerms) return message.reply(`${bot.emoji('error')} Kayıt yetkilisi değilsin.`);
    try {
      const { doc, member: m } = await regSvc.doRegister(bot, message.guild, message.author.id, member, 'male', name, 'kayıt');
      return message.reply(`${bot.emoji('success')} **${m.user.tag}** erkek olarak kayıt edildi: ${doc.name}${doc.age ? ' | ' + doc.age : ''}`);
    } catch (err) {
      return message.reply(`${bot.emoji('error')} Kayıt hatası: ${err.message}`);
    }
  }
};

