'use strict';
const { Warn } = require('../../../../shared/models');
const { ValidationError } = require('../../../../shared/utils/helpers');
const mod = require('../../services/moderation');

module.exports = {
  name: 'unwarn',
  aliases: ['warnkaldir'],
  description: 'Son verilen aktif uyarıyı kaldırir (veya warn ID ile)',
  usage: '.unwarn <kullanici> [warnID]',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin'],
  cooldown: 3,
  async run({ bot, message, args, client }) {
    if (!args[0]) throw new ValidationError('Kullanici gir.');
    const { resolveMember } = require('../../../../shared/utils/resolve');
    const member = await resolveMember(client, message.guild, args[0]);
    if (!member) throw new ValidationError('Kullanici bulunamadi.');
    const warnId = args[1] ? parseInt(args[1], 10) : null;
    const q = { guildId: bot.guildId, userId: member.id, removed: false };
    if (warnId) q.caseId = warnId;
    const w = await Warn.findOne(q).sort({ createdAt: -1 });
    if (!w) return message.reply(`${bot.emoji('info')} Aktif uyarı bulamadım.`);
    w.removed = true;
    await w.save();
    await mod.createCase(bot, { guild: message.guild, targetUserId: member.id, targetTag: member.user.tag, moderatorId: message.author.id, type: 'unwarn', reason: `Unwarn warn#${w.caseId}`, active: false });
    await bot.log.log('MODERATION', 'unwarn', { targetUserId: member.id, warnId: w.caseId, removedBy: message.author.id });
    return message.reply(`${bot.emoji('success')} Uyarı kaldırıldı (warn #${w.caseId}).`);
  }
};

