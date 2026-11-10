'use strict';
const { resolveMember, parseDuration, humanizeDuration } = require('../../../../shared/utils/resolve');
const mod = require('../../services/moderation');
const { ValidationError } = require('../../../../shared/utils/helpers');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'ban',
  aliases: ['yargı'],
  description: 'Kullaniciyi sunucudan kalıcı ya da süreli banla',
  usage: '.ban <kullanici> [sure] [sebep]',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin'],
  cooldown: 5,
  async run({ bot, message, args, client }) {
    const target = args[0];
    if (!target) throw new ValidationError('Kullanıcı belirtilmedi.', '.ban <kullanici> [sure] [sebep]');
    const maybe = parseDuration(args[1] || '');
    const reason = (maybe ? args.slice(2).join(' ') : args.slice(1).join(' ')) || bot.config.autoBanReason || '';
    const targetMember = await resolveMember(client, message.guild, target);
    let targetUser = targetMember ? targetMember.user : null;
    if (!targetUser) {
      const { resolveUser } = require('../../../../shared/utils/resolve');
      targetUser = await resolveUser(target, client);
    }
    if (!targetUser) throw new ValidationError('Kullanici bulunamadi.');
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) throw new ValidationError('Ban yetkim yok.');

    const doc = await mod.createCase(bot, {
      guild: message.guild, targetUserId: targetUser.id, targetTag: targetUser.tag,
      moderatorId: message.author.id, type: maybe ? 'tempban' : 'ban',
      reason, durationMs: maybe || 0, active: !!maybe
    });
    try {
      await message.guild.members.ban(targetUser.id, { reason: `${reason} | Case#${doc.caseId} | ${message.author.tag}`, deleteMessageSeconds: 0 });
    } catch (err) {
      return message.reply(`${bot.emoji('error')} Ban yapamadim: ${err.message}`);
    }
    if (maybe) mod.counters.set(bot.guildId, mod.counters.get(bot.guildId) || 0);
    await mod.sendModLog(bot, message.guild, doc);
    return message.reply(`${bot.emoji('success')} **${targetUser.tag}** ${doc.type} edildi. (Case #${doc.caseId})${doc.durationMs ? ` Unban aguza: ${humanizeDuration(doc.durationMs)}` : ''}`);
  }
};

