'use strict';
const { Register: RegModel, MemberStat } = require('../../../../shared/models');
const { resolveMember } = require('../../../../shared/utils/resolve');

module.exports = {
  name: 'kayıtgeçmişi',
  aliases: ['registerhistory'],
  description: 'Kullanicinin kayit geçmisini listeler',
  usage: '.kayıtgeçmişi [@kullanici]',
  permission: 'everyone',
  cooldown: 5,
  async run({ bot, message, args, client }) {
    const member = args[0] ? await resolveMember(client, message.guild, args[0]) : message.member;
    if (!member) return message.reply(`${bot.emoji('error')} Kullanici bulunamadi.`);
    const docs = await RegModel.find({ guildId: bot.guildId, userId: member.id }).sort({ createdAt: -1 }).limit(10).lean();
    if (!docs.length) return message.reply(`${bot.emoji('info')} Kayıt geçmişi yok.`);
    return message.reply(`**${member.user.tag} kayıt geçmişi:**\n` + docs.map((d) => `\`${d.createdAt.toISOString().slice(0, 10)}\` ${d.gender} — ${d.name}${d.age ? ' / ' + d.age : ''}${d.cancelled ? ' (iptal)' : ''} <@${d.staffId}>`).join('\n'));
  }
};

