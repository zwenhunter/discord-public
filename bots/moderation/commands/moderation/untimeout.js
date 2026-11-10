'use strict';
const { resolveMember } = require('../../../../shared/utils/resolve');
const mod = require('../../services/moderation');
const { ValidationError } = require('../../../../shared/utils/helpers');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'untimeout',
  aliases: ['ut'],
  description: 'Timeout kaldır',
  usage: '.untimeout <kullanici>',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin'],
  cooldown: 3,
  async run({ bot, message, args, client }) {
    const member = await resolveMember(client, message.guild, args[0]);
    if (!member) throw new ValidationError('Kullanici bulunamadi.');
    if (!member.isCommunicationDisabled()) return message.reply(`${bot.emoji('info')} Zaten timeoutda değil.`);
    await member.timeout(0, `Timeout remove - ${message.author.tag}`);
    await mod.createCase(bot, { guild: message.guild, targetUserId: member.id, targetTag: member.user.tag, moderatorId: message.author.id, type: 'untimeout', active: false });
    return message.reply(`${bot.emoji('success')} **${member.user.tag}** timeout kaldırıldı.`);
  }
};

