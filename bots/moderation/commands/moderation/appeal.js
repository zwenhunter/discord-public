'use strict';
const { Case } = require('../../../../shared/models');
const { ValidationError } = require('../../../../shared/utils/helpers');

module.exports = {
  name: 'appeal',
  aliases: ['itiraz'],
  description: 'Itiraz/istek gönder (ban cezasi icin)',
  usage: '.appeal <caseId> <mesaj>',
  permission: 'everyone',
  cooldown: 30,
  async run({ bot, message, args }) {
    const caseId = parseInt(args[0], 10);
    const content = args.slice(1).join(' ');
    if (!caseId || !content) throw new ValidationError('.appeal <caseId> <mesaj>');
    const doc = await Case.findOne({ guildId: bot.guildId, caseId });
    if (!doc) return message.reply(`${bot.emoji('info')} Case bulunamadi.`);
    if (doc.appeal?.published) return message.reply(`${bot.emoji('info')} Zaten itiraz gönderilmiş. Sonuc: ${doc.appeal.result || 'beklemede'}`);
    doc.appeal = { published: true, content: content.slice(0, 1000), decidedAt: null, result: null, decidedBy: null };
    await doc.save();
    await bot.log.log('MODERATION', 'appeal_submit', { caseId, userId: message.author.id, content });
    return message.reply(`${bot.emoji('success')} Itirazın gönderildi (case #${caseId}). Yetkililer karar verecek.`);
  }
};

