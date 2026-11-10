'use strict';
const { resolveMember, parseDuration, humanizeDuration } = require('../../../../shared/utils/resolve');
const mod = require('../../services/moderation');
const { ValidationError } = require('../../../../shared/utils/helpers');

module.exports = {
  name: 'jail',
  aliases: ['hapiste'],
  description: 'Kullanıcıyı jaille (tüm rollerini alır, jailRoles ekler; süreliyse sonra restore)',
  usage: '.jail <kullanici> [sure] [sebep]',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin'],
  cooldown: 5,
  async run({ bot, message, args, client }) {
    if (!args[0]) throw new ValidationError('Kullanici gir.');
    const member = await resolveMember(client, message.guild, args[0]);
    if (!member) throw new ValidationError('Kullanici bulunamadi.');
    if (mod.invalidHier(bot, message.guild, message.member, member)) throw new ValidationError('Hedef senden üst rolde.');
    const maybe = parseDuration(args[1] || '');
    const reason = (maybe ? args.slice(2).join(' ') : args.slice(1).join(' ')) || '';
    const jailRole = bot.config.jailRole;
    if (!jailRole || !message.guild.roles.cache.has(jailRole)) throw new ValidationError('.config jailRole ayarianamadi. config register da ayarlayın.');

    const removed = member.roles.cache.filter((r) => !r.managed && r.id !== message.guild.id).map((r) => r.id); // stored

    await member.roles.set([jailRole], `Jail - ${reason}`);
    const doc = await mod.createCase(bot, {
      guild: message.guild, targetUserId: member.id, targetTag: member.user.tag, moderatorId: message.author.id,
      type: maybe ? 'tempjail' : 'jail', reason, durationMs: maybe || 0, active: true,
      removedRoles: removed
    });
    await bot.log.log('MODERATION', 'jail', { targetUserId: member.id, removedRoles: removed, caseId: doc.caseId });
    await mod.sendModLog(bot, message.guild, doc);
    return message.reply(`${bot.emoji('success')} **${member.user.tag}** jail. (Case #${doc.caseId})${maybe ? ` Acılma: ${humanizeDuration(maybe)}` : ''}`);
  }
};

