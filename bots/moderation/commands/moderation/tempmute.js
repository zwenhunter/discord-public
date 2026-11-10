'use strict';
const { ValidationError } = require('../../../../shared/utils/helpers');
const getMuteRole = require('./mute').getMuteRole;
const mod = require('../../services/moderation');
const { resolveMember, parseDuration, humanizeDuration } = require('../../../../shared/utils/resolve');

module.exports = {
  name: 'tempmute',
  aliases: ['süreli-mute'],
  description: 'Sureli mute',
  usage: '.tempmute <kullanici> <sure> [sebep]',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin'],
  cooldown: 3,
  async run({ bot, message, args, client }) {
    if (args.length < 2) throw new ValidationError('.tempmute <kullanici> <sure>');
    const ms = parseDuration(args[1]);
    if (!ms) throw new ValidationError('Sure gecersiz.');
    const member = await resolveMember(client, message.guild, args[0]);
    if (!member) throw new ValidationError('Kullanici bulunamadi.');
    if (mod.invalidHier(bot, message.guild, message.member, member)) throw new ValidationError('Hedef senden üst rolde.');
    const reason = args.slice(2).join(' ') || '';
    const role = await getMuteRole(bot, message.guild);
    await member.roles.add(role, `tempmute ${reason}`);
    const doc = await mod.createCase(bot, { guild: message.guild, targetUserId: member.id, targetTag: member.user.tag, moderatorId: message.author.id, type: 'tempmute', reason, durationMs: ms, active: true });
    await mod.sendModLog(bot, message.guild, doc);
    return message.reply(`${bot.emoji('success')} **${member.user.tag}** ${humanizeDuration(ms)} mute. (Case #${doc.caseId})`);
  }
};

