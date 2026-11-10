'use strict';
const { MessageStat, VoiceStat, MemberStat, GuildGrowth, Case, Register: RegModel } = require('../../../../shared/models');
const { chunk } = require('../../../../shared/utils/helpers');

const WEEK_MS = 7 * 86400000;
const MONTH_MS = 30 * 86400000;

async function topMessages(bot, since, userId = null) {
  const q = { guildId: bot.guildId, date: { $gte: since } };
  if (userId) q.userId = userId;
  return MessageStat.aggregate([
    { $match: q },
    { $group: { _id: '$userId', count: { $sum: '$count' } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
}

function bar(count, max) {
  if (!max) return '';
  return '█'.repeat(Math.ceil(10 * count / max));
}

function fmtTop(users) {
  const max = users[0]?.count || 1;
  return users.map((u, i) => `${i + 1}. <@${u._id}>: **${u.count}** ${bar(u.count, max)}`).join('\n');
}

module.exports = {
  name: 'stat',
  aliases: ['istatistik'],
  description: 'Mesaj + ses istatistikleri (bugun/hafta/ay/toplam)',
  usage: '.stat <gun|hafta|ay|toplam> [@kullanici]',
  permission: 'everyone',
  cooldown: 10,
  async run({ bot, message, args, client }) {
    const period = (args[0] || 'gun').toLowerCase();
    const member = args[1] ? await require('../../../../shared/utils/resolve').resolveMember(client, message.guild, args[1]) : null;
    const userId = member?.id;
    if (period === 'toplam') {
      if (userId) {
        const m = await MemberStat.findOne({ guildId: bot.guildId, userId }).lean();
        return message.reply(`${member.user.tag}: bilgi mesaj **${m?.messages ?? 0}**, ses **${Math.floor((m?.voiceSeconds ?? 0) / 60)}dk**`);
      }
      const top = await MemberStat.find({ guildId: bot.guildId }).sort({ messages: -1 }).limit(10).lean();
      return message.reply(`**Toplam mesaj liderligi:**\n` + top.map((m, i) => `${i + 1}. <@${m.userId}>: ${m.messages}`).join('\n'));
    }
    const since = period === 'hafta' ? new Date(Date.now() - WEEK_MS).toISOString().slice(0, 10) : period === 'ay' ? new Date(Date.now() - MONTH_MS).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const msgs = await topMessages(bot, since, userId);
    if (!msgs.length) return message.reply(`${bot.emoji('info')} Veri yok.`);
    if (userId) return message.reply(`${member.user.tag} bu ${period}: **${msgs[0].count}** mesaj`);
    return message.reply(`**${period === 'gun' ? 'Bugün' : period} mesaj liderligi:**\n` + fmtTop(msgs));
  }
};

