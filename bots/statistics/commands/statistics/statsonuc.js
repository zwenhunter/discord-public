'use strict';
const { MessageStat, VoiceStat, MemberStat, InviteStat, GuildGrowth } = require('../../../../shared/models');

module.exports = {
  name: 'statsonuc',
  description: 'Istatistik infra ozeti (toplam kayit, bugunun toplami, cache)',
  usage: '.statsonuc',
  permission: ['bot-owner', 'guild-owner', 'admin'],
  cooldown: 15,
  async run({ bot, message }) {
    const date = new Date().toISOString().slice(0, 10);
    const [todayMsgs, todayVoice, totalMembers, growthRows] = await Promise.all([
      MessageStat.aggregate([{ $match: { guildId: bot.guildId, date } }, { $group: { _id: null, c: { $sum: '$count' } } }]),
      VoiceStat.aggregate([{ $match: { guildId: bot.guildId, date } }, { $group: { _id: null, s: { $sum: '$seconds' } } }]),
      MemberStat.countDocuments({ guildId: bot.guildId }),
      GuildGrowth.countDocuments({ guildId: bot.guildId })
    ]);
    return message.reply([
      `**Bugün:** ${todayMsgs[0]?.c ?? 0} mesaj, ${Math.floor((todayVoice[0]?.s ?? 0) / 60)}dk ses`,
      `**DB kayit:** ${totalMembers} kisi istatistiği, ${growthRows} gunluk büyüme verisi`,
      `**Stat bot aktif:** mesaj/voice collection calisiyor`
    ].join('\n'));
  }
};

