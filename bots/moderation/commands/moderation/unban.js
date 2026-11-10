'use strict';
const mod = require('../../services/moderation');
const { ValidationError } = require('../../../../shared/utils/helpers');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'unban',
  aliases: ['bankaldır'],
  description: 'Banlanmis kullanıcıi ac',
  usage: '.unban <userID> [sebep]',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin'],
  cooldown: 5,
  async run({ bot, message, args }) {
    const target = args[0]?.replace(/[^0-9]/g, '');
    if (!target) throw new ValidationError('UserID gir.', '.unban <userID> [sebep]');
    const reason = args.slice(1).join(' ') || 'unban';
    try {
      const user = await message.guild.members.unban(target, `${reason} | ${message.author.tag}`);
      const doc = await mod.createCase(bot, { guild: message.guild, targetUserId: target, targetTag: user ? user.tag : target, moderatorId: message.author.id, type: 'unban', reason, active: false });
      await mod.sendModLog(bot, message.guild, doc);
      return message.reply(`${bot.emoji('success')} **${user ? user.tag : target}** banı kaldırıldı. (Case #${doc.caseId})`);
    } catch (err) {
      return message.reply(`${bot.emoji('error')} Kullanici banlı değil ya da yetkim yok: ${err.message.slice(0, 200)}`);
    }
  }
};

