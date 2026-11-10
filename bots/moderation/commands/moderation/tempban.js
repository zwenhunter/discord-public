'use strict';
const { Case } = require('../../../../shared/models');
const mod = require('../../services/moderation');
const { ValidationError } = require('../../../../shared/utils/helpers');

module.exports = {
  name: 'tempban',
  aliases: ['süreli-ban'],
  description: 'Sureli ban (sure sonunda otomatik unban)',
  usage: '.tempban <kullanici> <sure> [sebep]',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin'],
  cooldown: 5,
  async run({ bot, message, args, client }) {
    if (args.length < 2) throw new ValidationError('.tempban <kullanici> <sure> [sebep]');
    const ms = require('../../../../shared/utils/resolve').parseDuration(args[1]);
    if (!ms) throw new ValidationError('Sure gecersiz. Orn: 1d2h3m');
    const { resolveMember } = require('../../../../shared/utils/resolve');
    let member = await resolveMember(client, message.guild, args[0]);
    let targetUser = member ? member.user : null;
    if (!targetUser) {
      const { resolveUser } = require('../../../../shared/utils/resolve');
      targetUser = await resolveUser(args[0], client);
    }
    if (!targetUser) throw new ValidationError('Kullanici bulunamadi.');
    const reason = args.slice(2).join(' ') || '';
    const doc = await mod.createCase(bot, { guild: message.guild, targetUserId: targetUser.id, targetTag: targetUser.tag, moderatorId: message.author.id, type: 'tempban', reason, durationMs: ms, active: true });
    try { await message.guild.members.ban(targetUser.id, { reason: `tempban: ${reason}` }); } catch (err) { return message.reply(`${bot.emoji('error')} Ban hatası: ${err.message}`); }
    await mod.sendModLog(bot, message.guild, doc);
    return message.reply(`${bot.emoji('success')} **${targetUser.tag}** ${humanizeDuration(ms)} banlandı. (Case #${doc.caseId})`);
  }
};

