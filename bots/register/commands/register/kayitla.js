'use strict';
const regSvc = require('../../services/register');
const { ValidationError } = require('../../../../shared/utils/helpers');
const { resolveMember } = require('../../../../shared/utils/resolve');

module.exports = {
  name: 'kayitla',
  description: 'Kayıt işlemini iptal et',
  usage: '.kayitla <kullanici>',
  aliases: ['kayitla-i', 'kayitla_iptal'],
  permission: ['bot-owner', 'guild-owner', 'admin', 'staff'],
  cooldown: 3,
  async run({ bot, message, args }) {
    if (!args[0]) throw new ValidationError('Kullanıcı gir.');
    const { checkStaff } = require('../../services/register');
    if (!(await checkStaff(message.member, bot))) return message.reply(`${bot.emoji('error')} Yetkili değilsin.`);
    try {
      const doc = await regSvc.cancelRegister(bot, message.guild, args[0]);
      return message.reply(`${bot.emoji('success')} Son kayıt iptal edildi (cancel by ${doc.staffId}).`);
    } catch (err) {
      return message.reply(`${bot.emoji('error')} ${err.message}`);
    }
  }
};

