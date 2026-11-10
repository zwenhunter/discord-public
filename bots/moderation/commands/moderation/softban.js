'use strict';
const mod = require('../../services/moderation');
module.exports = {
  name: 'softban',
  aliases: [],
  description: 'Kick + 24 saat mesaj silme: ban yapip hemen geri acar',
  usage: '.softban <kullanici> [sebep]',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin'],
  cooldown: 10,
  async run({ bot, message, args, client }) {
    if (!args[0]) return message.reply(bot.emoji('error') + ' Kullanici gir.');
    const { resolveMember } = require('../../../../shared/utils/resolve');
    const member = await resolveMember(client, message.guild, args[0]);
    if (!member) return message.reply(bot.emoji('error') + ' Kullanici bulunamadi.');
    const reason = args.slice(1).join(' ') || 'softban';
    try {
      await member.ban({ reason: 'softban: ' + reason, deleteMessageSeconds: 86400 });
      await message.guild.members.unban(member.id, 'softban out');
    } catch (err) {
      return message.reply(bot.emoji('error') + ' Softban hatasi: ' + err.message);
    }
    await mod.createCase(bot, { guild: message.guild, targetUserId: member.id, targetTag: member.user.tag, moderatorId: message.author.id, type: 'softban', reason, active: false });
    return message.reply(bot.emoji('success') + ' **' + member.user.tag + '** softban yapildi.');
  }
};

