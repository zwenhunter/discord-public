'use strict';
const { resolveMember } = require('../../../../shared/utils/resolve');
const mod = require('../../services/moderation');
const { ValidationError } = require('../../../../shared/utils/helpers');
const { Case } = require('../../../../shared/models');

module.exports = {
  name: 'unjail',
  aliases: ['hapisac'],
  description: 'Jaili kaldırır: aktif jail case durumunda restore ediler, jail rolu kaldırılır.',
  usage: '.unjail <kullanici>',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin'],
  cooldown: 5,
  async run({ bot, message, args, client }) {
    const member = await resolveMember(client, message.guild, args[0]);
    if (!member) throw new ValidationError('Kullanici bulunamadi.');

    const active = await Case.findOne({ guildId: bot.guildId, targetUserId: member.id, active: true, type: { $in: ['jail', 'tempjail'] } }).sort({ createdAt: -1 });
    const removedRoleIds = active?.data?.removedRoles || active?.removedRoles || [];

    await member.roles.set(removedRoleIds.length ? removedRoleIds : [], `Unjail - ${message.author.tag}`);
    if (active) {
      await Case.updateOne({ _id: active._id }, { $set: { active: false, resolvedAt: new Date(), resolvedBy: message.author.id } });
    }
    await mod.createCase(bot, { guild: message.guild, targetUserId: member.id, targetTag: member.user.tag, moderatorId: message.author.id, type: 'unjail', active: false });
    return message.reply(`${bot.emoji('success')} **${member.user.tag}** jail'den çıkarıldı.`);
  }
};

