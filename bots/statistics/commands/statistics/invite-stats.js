'use strict';
const { InviteStat } = require('../../../../shared/models');
const { User: UserModel } = require('discord.js');

module.exports = {
  name: 'invite-stats',
  aliases: ['davetstat'],
  description: 'Davet istatistikleri',
  usage: '.invite-stats [limit]',
  permission: 'everyone',
  cooldown: 10,
  async run({ bot, message, args }) {
    const limit = Math.min(parseInt(args[0], 10) || 10, 25);
    const top = await InviteStat.aggregate([
      { $match: { guildId: bot.guildId } },
      { $group: { _id: '$inviterId', uses: { $sum: '$uses' }, left: { $sum: '$left' } } },
      { $sort: { uses: -1 } },
      { $limit: limit }
    ]);
    if (!top.length) return message.reply(`${bot.emoji('info')} Davet verisi yok.`);
    return message.reply(`**Davet liderligi:**\n` + top.map((u, i) => `${i + 1}. <@${u._id}>: ${u.uses} kayit / ${u.left} ayrilmiş`).join('\n'));
  }
};

