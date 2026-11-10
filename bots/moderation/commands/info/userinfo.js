'use strict';
const { resolveMember } = require('../../../../shared/utils/resolve');
const { Case, Warn, MemberStat, Register: RegModel, TagUser } = require('../../../../shared/models');

module.exports = {
  name: 'userinfo',
  aliases: ['info'],
  description: 'Kullanici bilgisi + istatistikleri (DB + Discord)',
  usage: '.userinfo [kullanici]',
  permission: 'everyone',
  cooldown: 3,
  async run({ bot, message, args, client }) {
    const member = args[0] ? await resolveMember(client, message.guild, args[0]) : message.member;
    if (!member) return message.reply(`${bot.emoji('error')} Kullanici bulunamadi.`);
    const u = member.user;
    const [msgs, voiceSec, warns, registerDoc, tagDoc, bannedCount] = await Promise.all([
      MemberStat.findOne({ guildId: bot.guildId, userId: member.id }).lean(),
      null,
      Warn.countDocuments({ guildId: bot.guildId, userId: member.id, removed: false }),
      RegModel.countDocuments({ guildId: bot.guildId, userId: member.id, cancelled: false }),
      TagUser.findOne({ guildId: bot.guildId, userId: member.id }).lean(),
      Case.countDocuments({ guildId: bot.guildId, targetUserId: member.id, type: { $in: ['ban', 'tempban'] } })
    ]);
    const roles = member.roles.cache.filter((r) => r.id !== message.guild.id).map((r) => r.name);
    return message.reply([
      `**Kullanici:** ${u.tag} (${u.id}) ${u.bot ? '[BOT]' : ''}`,
      `**Katilim:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>   **Hesap:** <t:${Math.floor(u.createdTimestamp / 1000)}:R>`,
      `**Roller (${roles.length}):** ${roles.slice(0, 15).join(', ') || '-'}${roles.length > 15 ? `...` : ''}`,
      `**Uyari:** ${warns}   **Ceza:** ${bannedCount}   **Kayit:** ${registerDoc}`,
      `**Tag:** ${tagDoc ? tagDoc.tag || 'uyesiz' : 'yok'} (joinedAt: ${tagDoc ? `<t:${Math.floor(new Date(tagDoc.joinedAt || 0).getTime() / 1000)}:R>` : '-'})`,
      `**Mesaj:** ${msgs?.messages ?? 0}   **Ses:** ${Math.floor((msgs?.voiceSeconds ?? 0) / 60)}dk`
    ].join('\n'));
  }
};

