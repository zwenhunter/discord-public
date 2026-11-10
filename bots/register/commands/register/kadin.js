'use strict';
const regSvc = require('../../services/register');
const { ValidationError } = require('../../../../shared/utils/helpers');

module.exports = {
  name: 'kadın',
  description: 'Kadın olarak kayıt',
  usage: '.kadın <kullanici> <isim> [yas]',
  aliases: ['kadin', 'female'],
  permission: ['bot-owner', 'guild-owner', 'admin', 'staff'],
  cooldown: 3,
  async run({ bot, message, args, client }) {
    if (args.length < 2) throw new ValidationError('Kullanim: .kadın <kullanici> <isim> [yas]');
    const staffOk = await regSvc.checkStaff(message.member, bot);
    if (!staffOk) return message.reply(`${bot.emoji('error')} Kayıt yetkilisi değilsin.`);
    try {
      const { doc, member: m } = await regSvc.doRegister(bot, message.guild, message.author.id, args[0], 'female', args.slice(1).join(' '), 'kayıt');
      return message.reply(`${bot.emoji('success')} **${m.user.tag}** kadın olarak kayıt edildi: ${doc.name}${doc.age ? ' | ' + doc.age : ''}`);
    } catch (err) {
      return message.reply(`${bot.emoji('error')} Kayıt hatası: ${err.message}`);
    }
  }
};

