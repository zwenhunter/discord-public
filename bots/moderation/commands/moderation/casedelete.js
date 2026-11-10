'use strict';
const { Case } = require('../../../../shared/models');
const mod = require('../../services/moderation');
const { ValidationError } = require('../../../../shared/utils/helpers');

module.exports = {
  name: 'casedelete',
  aliases: ['casedel'],
  description: 'Case kaydini siler',
  usage: '.casedelete <caseId>',
  permission: ['bot-owner', 'guild-owner', 'admin'],
  cooldown: 5,
  async run({ bot, message, args }) {
    const caseId = parseInt(args[0], 10);
    if (!caseId) throw new ValidationError('Case ID gir.');
    const res = await Case.deleteOne({ guildId: bot.guildId, caseId });
    if (!res.deletedCount) return message.reply(`${bot.emoji('info')} Case bulunamadi.`);
    await bot.log.log('MODERATION', 'case_delete', { caseId, moderatorId: message.author.id });
    return message.reply(`${bot.emoji('success')} Case #${caseId} silindi.`);
  }
};

