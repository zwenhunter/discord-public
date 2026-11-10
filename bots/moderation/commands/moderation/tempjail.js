'use strict';
const mod = require('../../services/moderation');
const { ValidationError } = require('../../../../shared/utils/helpers');
const { resolveMember, parseDuration, humanizeDuration } = require('../../../../shared/utils/resolve');

module.exports = {
  name: 'tempjail',
  aliases: ['süreli-jail'],
  description: 'Sureli jail (jail + süre sonunda roller geri gelmei)',
  usage: '.tempjail <kullanici> <sure> [sebep]',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin'],
  cooldown: 5,
  async run({ bot, message, args, client }) {
    if (args.length < 2) throw new ValidationError('.tempjail <kullanici> <sure>');
    const ms = parseDuration(args[1]);
    if (!ms) throw new ValidationError('Sure gecersiz.');
    const member = await resolveMember(client, message.guild, args[0]);
    if (!member) throw new ValidationError('Kullanici bulunamadi.');
    const reason = args.slice(2).join(' ') || '';
    const jailRole = bot.config.jailRole;
    if (!jailRole || !message.guild.roles.cache.has(jailRole)) throw new ValidationError('config/jailRole ayarlanmalı.');
    const removed = member.roles.cache.filter((r) => !r.managed && r.id !== message.guild.id).map((r) => r.id);
    await member.roles.set([jailRole], `tempjail ${reason}`);
    const doc = await mod.createCase(bot, { guild: message.guild, targetUserId: member.id, targetTag: member.user.tag, moderatorId: message.author.id, type: 'tempjail', reason, durationMs: ms, active: true, removedRoles: removed });
    await mod.sendModLog(bot, message.guild, doc);
    return message.reply(`${bot.emoji('success')} **${member.user.tag}** ${humanizeDuration(ms)} jail. (Case #${doc.caseId})`);
  }
};

