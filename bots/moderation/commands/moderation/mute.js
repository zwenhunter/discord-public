'use strict';
const { resolveMember, parseDuration, humanizeDuration } = require('../../../../shared/utils/resolve');
const mod = require('../../services/moderation');
const { ValidationError } = require('../../../../shared/utils/helpers');
const { PermissionFlagsBits } = require('discord.js');
const { GuildSettings } = require('../../../../shared/models');

// config'den muteRole aldığı yer (publicMuteRole)
async function getMuteRole(bot, guild) {
  const settings = await GuildSettings.findOne({ guildId: bot.guildId });
  const roleId = settings?.settings?.muteRole || bot.config.publicMuteRole;
  if (roleId && guild.roles.cache.has(roleId)) return guild.roles.cache.get(roleId);
  // otomatik oluştur (muted rolü)
  if (guild.roles.cache.find((r) => r.name === 'Muted')) return guild.roles.cache.find((r) => r.name === 'Muted');
  const role = await guild.roles.create({ name: 'Muted', color: 0x808080, permissions: [] });
  for (const ch of guild.channels.cache.values()) {
    await ch.permissionOverwrites.edit(role, { SendMessages: false, SendMessagesInThreads: false, AddReactions: false, Speak: false }).catch(() => {});
  }
  await GuildSettings.updateOne({ guildId: bot.guildId }, { $set: { 'settings.muteRole': role.id } }, { upsert: true });
  return role;
}

module.exports = {
  name: 'mute',
  aliases: ['sus'],
  description: 'Metinsel mute (role based). Sure icin .tempmute kullan ya da .mute <kullanici> <sure>',
  usage: '.mute <kullanici> [sure] [sebep]',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin'],
  cooldown: 3,
  async run({ bot, message, args, client }) {
    if (!args[0]) throw new ValidationError('Kullanici gir.');
    const member = await resolveMember(client, message.guild, args[0]);
    if (!member) throw new ValidationError('Kullanici bulunamadi.');
    if (mod.invalidHier(bot, message.guild, message.member, member)) throw new ValidationError('Hedef senden üst rolde.');
    const maybe = parseDuration(args[1] || '');
    const reason = (maybe ? args.slice(2).join(' ') : args.slice(1).join(' ')) || '';
    const role = await getMuteRole(bot, message.guild);
    if (!role) throw new ValidationError('Mute rolu olusturulamadi.');
    if (member.roles.highest.position >= message.guild.members.me.roles.highest.position) throw new ValidationError('Botun rolünden üst hedef.');
    await member.roles.add(role, `${reason} | ${message.author.tag}`);
    const doc = await mod.createCase(bot, { guild: message.guild, targetUserId: member.id, targetTag: member.user.tag, moderatorId: message.author.id, type: maybe ? 'tempmute' : 'mute', reason, durationMs: maybe || 0, active: !!maybe });
    await mod.sendModLog(bot, message.guild, doc);
    return message.reply(`${bot.emoji('success')} **${member.user.tag}** mute. (Case #${doc.caseId})${maybe ? ` Acilma: ${humanizeDuration(maybe)}` : ''}`);
  }
};

module.exports.getMuteRole = getMuteRole;

