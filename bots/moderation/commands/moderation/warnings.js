'use strict';
const { Warn } = require('../../../../shared/models');
const { resolveMember } = require('../../../../shared/utils/resolve');

module.exports = {
  name: 'warnings',
  aliases: ['uyarilar', 'warns'],
  description: 'Kullanıcının aktif uyarilerini gösterir',
  usage: '.warnings <kullanici>',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin', 'staff'],
  cooldown: 3,
  async run({ bot, message, args, client }) {
    const member = await resolveMember(client, message.guild, args[0]);
    if (!member) return message.reply(`${bot.emoji('error')} Kullanici bulunamadi.`);
    const warns = await Warn.find({ guildId: bot.guildId, userId: member.id, removed: false }).sort({ createdAt: -1 }).lean();
    if (!warns.length) return message.reply(`${bot.emoji('info')} Aktif uyarı yok.`);
    return message.reply(`**${member.user.tag}** aktif uyarılar (${warns.length}):\n` + warns.map((w) => `#${w.caseId || '-'} — ${w.reason} — <t:${Math.floor(new Date(w.createdAt).getTime() / 1000)}:R> — <@${w.moderatorId}>`).join('\n').slice(0, 1900));
  }
};

