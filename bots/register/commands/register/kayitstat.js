'use strict';
const { Register: RegModel, MemberStat } = require('../../../../shared/models');

module.exports = {
  name: 'kayıtstat',
  aliases: ['kayitstat'],
  description: 'Kayıt yetkilisi istatistikleri / liderlik',
  usage: '.kayıtstat [limit]',
  permission: 'everyone',
  cooldown: 10,
  async run({ bot, message, args }) {
    const limit = Math.min(parseInt(args[0], 10) || 10, 25);
    const top = await RegModel.aggregate([
      { $match: { guildId: bot.guildId, cancelled: false } },
      { $group: { _id: '$staffId', c: { $sum: 1 }, male: { $sum: { $cond: [{ $eq: ['$gender', 'male'] }, 1, 0] } }, female: { $sum: { $cond: [{ $eq: ['$gender', 'female'] }, 1, 0] } } } },
      { $sort: { c: -1 } },
      { $limit: limit }
    ]);
    if (!top.length) return message.reply(`${bot.emoji('info')} Kayıt verisi yok.`);
    return message.reply(`**${message.guild.name} kayıt liderlik:**\n` + top.map((d, i) => `${i + 1}. <@${d._id}>: **${d.c}** (${d.male} erkek / ${d.female} kız)`).join('\n'));
  }
};

