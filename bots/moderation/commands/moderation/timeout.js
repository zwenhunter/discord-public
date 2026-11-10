'use strict';
const { resolveMember, parseDuration, humanizeDuration } = require('../../../../shared/utils/resolve');
const mod = require('../../services/moderation');
const { ValidationError } = require('../../../../shared/utils/helpers');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'timeout',
  aliases: ['zamanasimi', 'tm'],
  description: 'Kullaniciya timeout ver (Discord native)',
  usage: '.timeout <kullanici> <sure|1d2h3m> [sebep]',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin'],
  cooldown: 3,
  async run({ bot, message, args, client }) {
    if (!args[0] || !args[1]) throw new ValidationError('Eksik arguman.', '.timeout <kullanici> <sure> [sebep]');
    const ms = parseDuration(args[1]);
    if (!ms || ms < 10000) throw new ValidationError('Sure gecersiz (min 10sn).');
    if (ms > 28 * 24 * 3600 * 1000) throw new ValidationError('Discord max timeout 28 gündür.');
    const member = await resolveMember(client, message.guild, args[0]);
    if (!member) throw new ValidationError('Kullanici bulunamadi.');
    if (mod.invalidHier(bot, message.guild, message.member, member)) throw new ValidationError('Hedef senden üst rolde.');
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) throw new ValidationError('Timeout yetkim yok.');
    const reason = args.slice(2).join(' ') || '';
    await member.timeout(ms, `${reason} - ${message.author.tag}`);
    const doc = await mod.createCase(bot, { guild: message.guild, targetUserId: member.id, targetTag: member.user.tag, moderatorId: message.author.id, type: 'timeout', reason, durationMs: ms, active: true });
    await mod.sendModLog(bot, message.guild, doc);
    return message.reply(`${bot.emoji('success')} **${member.user.tag}** ${humanizeDuration(ms)} timeout. (Case #${doc.caseId})`);
  }
};

