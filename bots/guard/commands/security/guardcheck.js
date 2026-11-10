'use strict';
const guards = require('../../services/guard');
const { resolveMember } = require('../../../../shared/utils/resolve');

module.exports = {
  name: 'guardcheck',
  aliases: ['gcheck'],
  description: 'Bir kullanicinin guard whitelist/trusted durumunu kontrol eder',
  usage: '.guardcheck @kullanici',
  permission: ['bot-owner', 'guild-owner', 'admin'],
  cooldown: 5,
  async run({ bot, message, args }) {
    const member = await resolveMember(bot.client, message.guild, args[0]);
    if (!member) return message.reply(`${bot.emoji('error')} Uye bulunamadi.`);
    const wl = await guards.isInWhitelist(bot, member.id);
    const actions = (guards.state()?.securityActions?.get(member.id) || []).length;
    return message.reply(`**${member.user.tag}**\nWhitelist: ${wl ? 'EVET' : 'HAYIR'}\nSon 5dk security action: ${actions}`);
  }
};

