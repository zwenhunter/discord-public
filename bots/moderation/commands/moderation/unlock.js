'use strict';
const { PermissionFlagsBits } = require('discord.js');
const { ValidationError } = require('../../../../shared/utils/helpers');

module.exports = {
  name: 'unlock',
  aliases: ['kanal-ac'],
  description: 'Kanal kilidini açar',
  usage: '.unlock [#kanal]',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin'],
  cooldown: 5,
  async run({ bot, message, args }) {
    const { resolveChannel } = require('../../../../shared/utils/resolve');
    const channel = args[0] ? resolveChannel(message.guild, args[0]) : message.channel;
    if (!channel) throw new ValidationError('Kanal bulunamadi.');
    await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
    return message.reply(`${bot.emoji('success')} **${channel.name}** kilidi açıldı.`);
  }
};

