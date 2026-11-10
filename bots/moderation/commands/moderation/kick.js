'use strict';
const { resolveMember } = require('../../../../shared/utils/resolve');
const mod = require('../../services/moderation');
const { ValidationError } = require('../../../../shared/utils/helpers');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'kick',
  aliases: ['at'],
  description: 'Kullanıcıyı sunucudan at',
  usage: '.kick <kullanici> [sebep]',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin'],
  cooldown: 5,
  async run({ bot, message, args, client }) {
    if (!args[0]) throw new ValidationError('Kullanici gir.', '.kick <kullanici> [sebep]');
    const member = await resolveMember(client, message.guild, args[0]);
    if (!member) throw new ValidationError('Kullanici bulunamadi.');
    const reason = args.slice(1).join(' ') || '';
    if (mod.invalidHier(bot, message.guild, message.member, member)) throw new ValidationError('Hedef rol hiyerarşisinde senden yukarda.');
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) throw new ValidationError('Kick yetkim yok.');
    await member.kick(`${reason} | Case | ${message.author.tag}`);
    const doc = await mod.createCase(bot, { guild: message.guild, targetUserId: member.id, targetTag: member.user.tag, moderatorId: message.author.id, type: 'kick', reason, active: false });
    await mod.sendModLog(bot, message.guild, doc);
    return message.reply(`${bot.emoji('success')} **${member.user.tag}** kicklendi. (Case #${doc.caseId})`);
  }
};

