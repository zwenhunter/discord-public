'use strict';
const { MessageStat } = require('../../../../shared/models');
const { resolveMember } = require('../../../../shared/utils/resolve');
const WEEK_MS = 7 * 86400000, MONTH_MS = 30 * 86400000;

module.exports = {
  name: 'mymessages',
  aliases: ['mesajgecmis'],
  description: 'Kullanicinin mesaj geçmişi (gun gun)',
  usage: '.mymessages [@kullanici]',
  permission: 'everyone',
  cooldown: 10,
  async run({ bot, message, args, client }) {
    const member = args[0] ? await resolveMember(client, message.guild, args[0]) : message.member;
    const docs = await MessageStat.aggregate([
      { $match: { guildId: bot.guildId, userId: member.id } },
      { $group: { _id: '$date', c: { $sum: '$count' } } },
      { $sort: { _id: -1 } },
      { $limit: 14 }
    ]);
    if (!docs.length) return message.reply(`${bot.emoji('info')} Veri yok.`);
    return message.reply(`**${member.user.tag} mesaj geçmişi (son 14 gün):**\n` + docs.map((d) => `\`${d._id}\` ${d.c} mesaj`).join('\n'));
  }
};

