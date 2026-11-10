'use strict';
const { resolveMember } = require('../../../../shared/utils/resolve');
const mod = require('../../services/moderation');
const { ValidationError } = require('../../../../shared/utils/helpers');
const getMuteRole = require('./mute').getMuteRole;

module.exports = {
  name: 'unmute',
  aliases: ['suskaldır'],
  description: 'Metinsel mute kaldır',
  usage: '.unmute <kullanici>',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin'],
  cooldown: 3,
  async run({ bot, message, args, client }) {
    const member = await resolveMember(client, message.guild, args[0]);
    if (!member) throw new ValidationError('Kullanici bulunamadi.');
    const role = await getMuteRole(bot, message.guild);
    await member.roles.remove(role, `unmute - ${message.author.tag}`);
    await mod.createCase(bot, { guild: message.guild, targetUserId: member.id, targetTag: member.user.tag, moderatorId: message.author.id, type: 'unmute', active: false });
    return message.reply(`${bot.emoji('success')} **${member.user.tag}** unmute.`);
  }
};

