'use strict';
const { resolveMember } = require('../../../../shared/utils/resolve');
const { ValidationError } = require('../../../../shared/utils/helpers');

module.exports = {
  name: 'resetnick',
  aliases: ['nickreset'],
  description: 'Nickname resetler',
  usage: '.resetnick <kullanici>',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin'],
  cooldown: 3,
  async run({ bot, message, args, client }) {
    const member = await resolveMember(client, message.guild, args[0]);
    if (!member) throw new ValidationError('Kullanici bulunamadi.');
    await member.setNickname(null, `resetnick ${message.author.tag}`);
    return message.reply(`${bot.emoji('success')} Nick resetlendi.`);
  }
};

