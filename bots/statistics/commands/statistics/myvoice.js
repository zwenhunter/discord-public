'use strict';
const { VoiceStat, MemberStat, MessageStat } = require('../../../../shared/models');
const { resolveMember, humanizeDuration } = require('../../../../shared/utils/resolve');

module.exports = {
  name: 'myvoice',
  aliases: ['voicegecmis'],
  description: 'Kullanicinin ses geçmişi (gun gun)',
  usage: '.myvoice [@kullanici]',
  permission: 'everyone',
  cooldown: 10,
  async run({ bot, message, args, client }) {
    const member = args[0] ? await resolveMember(client, message.guild, args[0]) : message.member;
    const docs = await VoiceStat.find({ guildId: bot.guildId, userId: member.id }).sort({ date: -1 }).limit(14).lean();
    if (!docs.length) return message.reply(`${bot.emoji('info')} Veri yok.`);
    return message.reply(`**${member.user.tag} ses geçmişi (son 14 gün, AFK hariç):**\n` + docs.map((d) => `\`${d.date}\` **${Math.floor(d.seconds / 60)}dk** <#${d.channelId}>`).join('\n'));
  }
};

