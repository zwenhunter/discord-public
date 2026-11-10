'use strict';
const { Case } = require('../../../../shared/models');

module.exports = {
  name: 'modstats',
  aliases: ['modistatistik'],
  description: 'Moderator istatistikleri (ceza sayilarina gore)',
  usage: '.modstats [moderator]',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin', 'staff'],
  cooldown: 10,
  async run({ bot, message, args }) {
    if (args[0]) {
      const id = args[0].replace(/[^0-9]/g, '');
      const byType = await Case.aggregate([
        { $match: { guildId: bot.guildId, moderatorId: id } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      if (!byType.length) return message.reply(`${bot.emoji('info')} Toci kayit yok.`);
      return message.reply(`<@${id}> ceza istatistikleri:\n` + byType.map((t) => `${t._id}: **${t.count}**`).join('. | '));
    }
    const top = await Case.aggregate([
      { $match: { guildId: bot.guildId } },
      { $group: { _id: '$moderatorId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    return message.reply(`**En aktif moderatorlar:**\n` + top.map((t, i) => `${i + 1}. <@${t._id}> — ${t.count} ceza`).join('\n'));
  }
};

