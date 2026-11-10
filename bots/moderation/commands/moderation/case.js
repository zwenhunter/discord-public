'use strict';
const { Case } = require('../../../../shared/models');
const mod = require('../../services/moderation');

module.exports = {
  name: 'case',
  aliases: ['ceza'],
  description: 'Case ID ile ceza detayini goster',
  usage: '.case <caseId>',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin', 'staff'],
  cooldown: 3,
  async run({ bot, message, args }) {
    const caseId = parseInt(args[0], 10);
    if (!caseId) return message.reply(`${bot.emoji('error')} Case ID gir.`);
    const doc = await Case.findOne({ guildId: bot.guildId, caseId });
    if (!doc) return message.reply(`${bot.emoji('info')} Case bulunamadi.`);
    return message.reply([
      `**Case #${doc.caseId} — ${doc.type}** ${doc.active ? '(aktif)' : '(kapali)'}`,
      `Hedef: <@${doc.targetUserId}> (${doc.targetTag || doc.targetUserId})`,
      `Moderator: <@${doc.moderatorId}>`,
      `Sebep: ${doc.reason || '-'}`,
      `Sure: ${doc.durationMs ? doc.durationMs / 1000 + ' sn' : 'Kalici'}`,
      `Tarih: <t:${Math.floor(new Date(doc.createdAt).getTime() / 1000)}:R>`,
      doc.expiresAt ? `Bitis: <t:${Math.floor(new Date(doc.expiresAt).getTime() / 1000)}:R>` : ''
    ].filter(Boolean).join('\n'));
  }
};

