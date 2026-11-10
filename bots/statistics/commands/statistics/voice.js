'use strict';
const { VoiceStat, MemberStat } = require('../../../../shared/models');
const WEEK_MS = 7 * 86400000, MONTH_MS = 30 * 86400000;

module.exports = {
  name: 'voice',
  aliases: ['sesstat'],
  description: 'Ses istatistikleri (gun/hafta/ay/toplam), AFK süreleri hariç',
  usage: '.voice <gun|hafta|ay|toplam>',
  permission: 'everyone',
  cooldown: 10,
  async run({ bot, message, args }) {
    const period = (args[0] || 'gun').toLowerCase();
    if (period === 'toplam') {
      const top = await MemberStat.find({ guildId: bot.guildId }).sort({ voiceSeconds: -1 }).limit(10).lean();
      return message.reply(`**Toplam ses liderligi (AFK haric):**\n` + top.map((m, i) => `${i + 1}. <@${m.userId}>: ${Math.floor(m.voiceSeconds / 60)}dk`).join('\n'));
    }
    const since = period === 'hafta' ? new Date(Date.now() - WEEK_MS) : period === 'ay' ? new Date(Date.now() - MONTH_MS) : new Date();
    const q = { guildId: bot.guildId, date: { $gte: since.toISOString().slice(0, 10) } };
    const top = await VoiceStat.aggregate([
      { $match: q },
      { $group: { _id: '$userId', sec: { $sum: '$seconds' } } },
      { $sort: { sec: -1 } },
      { $limit: 10 }
    ]);
    if (!top.length) return message.reply(`${bot.emoji('info')} Veri yok.`);
    return message.reply(`**${period} ses liderligi (AFK haric):**\n` + top.map((u, i) => `${i + 1}. <@${u._id}>: ${Math.floor(u.sec / 60)}dk`).join('\n'));
  }
};

