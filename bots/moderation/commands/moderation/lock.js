'use strict';
const { PermissionFlagsBits } = require('discord.js');
const { ValidationError } = require('../../../../shared/utils/helpers');

module.exports = {
  name: 'lock',
  aliases: ['kanal-k'],
  description: 'Kanal kilitler (everyone send-message off)',
  usage: '.lock [#kanal] [sebep]',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin'],
  cooldown: 5,
  async run({ bot, message, args }) {
    const { resolveChannel } = require('../../../../shared/utils/resolve');
    const channel = args[0] ? resolveChannel(message.guild, args[0]) : message.channel;
    if (!channel) throw new ValidationError('Kanal bulunamadi.');
    if (!channel.permissionsFor(message.guild.members.me).has(PermissionFlagsBits.ManageChannels)) {
      throw new ValidationError('Kanal manage yetkim yok.');
    }
    const reason = args.slice(1).join(' ') || 'kanal lock';
    await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false }, { reason });
    return message.reply(`${bot.emoji('success')} **${channel.name}** kilitlendi. Sebep: ${reason}`);
  }
};

