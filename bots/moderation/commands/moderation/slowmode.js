'use strict';
const { PermissionFlagsBits } = require('discord.js');
const { ValidationError } = require('../../../../shared/utils/helpers');

module.exports = {
  name: 'slowmode',
  aliases: ['yavasmod'],
  description: 'Yavaş mod ayarı. 0 = off.',
  usage: '.slowmode <saniye|#kanal> [saniye]',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin'],
  cooldown: 3,
  async run({ bot, message, args }) {
    let seconds = args[0] && /^\d+$/.test(args[0]) ? parseInt(args[0], 10) : null;
    let target = message.channel;
    if (args[0] && !/^\d+$/.test(args[0]) && args[1] && /^\d+$/.test(args[1])) {
      const { resolveChannel } = require('../../../../shared/utils/resolve');
      target = resolveChannel(message.guild, args[0]) || message.channel;
      seconds = parseInt(args[1], 10);
    }
    if (seconds === null || seconds < 0 || seconds > 21600) throw new ValidationError('Saniye 0-21600 arası olmalı.');
    await target.setRateLimitPerUser(seconds, `slowmode ${message.author.tag}`);
    return message.reply(`${bot.emoji('success')} ${seconds === 0 ? 'Kapatildi' : `${seconds} sn`} slowmode: <#${target.id}>`);
  }
};

