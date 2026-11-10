'use strict';
const { MessageStat } = require('../../../../shared/models');

module.exports = {
  name: 'channel-stats',
  aliases: ['kanalstat'],
  description: 'Kanal bazlı mesaj istatistikleri',
  usage: '.channel-stats <gun|hafta|ay>',
  permission: 'everyone',
  cooldown: 10,
  async run({ bot, message, args }) {
    const period = args[0] || 'gun';
    const since = period === 'hafta' ? new Date(Date.now() - 7 * 86400000) : period === 'ay' ? new Date(Date.now() - 30 * 86400000) : new Date();
    const top = await MessageStat.aggregate([
      { $match: { guildId: bot.guildId, date: { $gte: since.toISOString().slice(0, 10) } } },
      { $group: { _id: '$channelId', count: { $sum: '$count' } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    if (!top.length) return message.reply(`${bot.emoji('info')} Veri yok.`);
    return message.reply(`**Kanal bazlı mesaj (${period}):**\n` + top.map((c, i) => `${i + 1}. <#${c._id}>: ${c.count}`).join('\n'));
  }
};

