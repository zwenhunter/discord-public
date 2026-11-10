'use strict';
const { Case, Register: RegModel, VoiceStat, MessageStat, GuildLog } = require('../../../../shared/models');

module.exports = {
  name: 'staffstats',
  aliases: ['yteamstat'],
  description: 'Yetkili istatistikleri (kayit/ban/kick/timeout/jail)',
  usage: '.staffstats [limit]',
  permission: ['bot-owner', 'guild-owner', 'admin', 'staff'],
  cooldown: 15,
  async run({ bot, message, args }) {
    const limit = Math.min(parseInt(args[0], 10) || 10, 20);
    const [regs, bans, kicks, timeouts, jails] = await Promise.all([
      RegModel.aggregate([{ $match: { guildId: bot.guildId, cancelled: false } }, { $group: { _id: '$staffId', c: { $sum: 1 } } }, { $sort: { c: -1 } }, { $limit: limit }]),
      Case.aggregate([{ $match: { guildId: bot.guildId, type: { $in: ['ban', 'tempban'] } } }, { $group: { _id: '$moderatorId', c: { $sum: 1 } } }, { $sort: { c: -1 } }, { $limit: limit }]),
      Case.aggregate([{ $match: { guildId: bot.guildId, type: 'kick' } }, { $group: { _id: '$moderatorId', c: { $sum: 1 } } }, { $sort: { c: -1 } }, { $limit: limit }]),
      Case.aggregate([{ $match: { guildId: bot.guildId, type: 'timeout' } }, { $group: { _id: '$moderatorId', c: { $sum: 1 } } }, { $sort: { c: -1 } }, { $limit: limit }]),
      Case.aggregate([{ $match: { guildId: bot.guildId, type: { $in: ['jail', 'tempjail'] } } }, { $group: { _id: '$moderatorId', c: { $sum: 1 } } }, { $sort: { c: -1 } }, { $limit: limit }])
    ]);
    const fmt = (arr) => arr.map((t, i) => `${i + 1}. <@${t._id}>: ${t.c}`).join('\n') || '-';
    return message.reply([
      `**Kayit:**\n${fmt(regs)}`,
      `**Ban:**\n${fmt(bans)}`,
      `**Kick:**\n${fmt(kicks)}`,
      `**Timeout:**\n${fmt(timeouts)}`,
      `**Jail:**\n${fmt(jails)}`
    ].join('\n').slice(0, 1900));
  }
};

