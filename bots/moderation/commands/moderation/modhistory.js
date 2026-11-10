'use strict';
const { Case } = require('../../../../shared/models');
const { humanizeDuration } = require('../../../../shared/utils/resolve');
const { ValidationError } = require('../../../../shared/utils/helpers');

module.exports = {
  name: 'modhistory',
  aliases: ['modlog', 'cezalar'],
  description: 'Kullanıcının tüm ceza geçmişi',
  usage: '.modhistory <kullanici> [sayfa]',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin', 'staff'],
  cooldown: 5,
  async run({ bot, message, args, client }) {
    if (!args[0]) throw new ValidationError('Kullanici gir.');
    const { resolveMember } = require('../../../../shared/utils/resolve');
    const member = await resolveMember(client, message.guild, args[0]);
    if (!member) return message.reply(`${bot.emoji('error')} Kullanici bulunamadi.`);
    const page = Math.max(parseInt(args[1], 10) || 1, 1);
    const per = 10;
    const [total, docs] = await Promise.all([
      Case.countDocuments({ guildId: bot.guildId, targetUserId: member.id }),
      Case.find({ guildId: bot.guildId, targetUserId: member.id }).sort({ createdAt: -1 }).skip((page - 1) * per).limit(per).lean()
    ]);
    if (!docs.length) return message.reply(`${bot.emoji('info')} Ceza kaydi yok.`);
    const lines = docs.map((c) => `\`${c.caseId}\` ${c.type} — ${c.reason || '-'} — <t:${Math.floor(new Date(c.createdAt).getTime() / 1000)}:R>${c.durationMs ? ` (${humanizeDuration(c.durationMs)})` : ''} <@${c.moderatorId}>`);
    return message.reply(`**${member.user.tag}** ceza geçmişi (sayfa ${page}/${Math.max(1, Math.ceil(total / per))}, toplam ${total}):\n${lines.join('\n')}`.slice(0, 1950));
  }
};

