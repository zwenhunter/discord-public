'use strict';
const { PermissionFlagsBits } = require('discord.js');
const { Warn, Case } = require('../../../shared/models');
const { createCase } = require('./moderation');

const inviteRegex = /(?:discord\.gg|discord(?:app)?\.com\/invite)\/[\w-]+/i;
const linkRegex = /(https?:\/\/)[^\s]+/i;

// message windows
const windowMap = new Map();

function pushWindow(userId, msg, intervalMs) {
  const arr = windowMap.get(userId) || [];
  const now = Date.now();
  arr.push({ ts: now, content: msg.content, mentions: msg.mentions.users.size, attachments: msg.attachments.size, emojis: ((msg.content || '').match(/<(a)?:[\w]+:\d+>/g) || []).length });
  const trimmed = arr.filter((e) => now - e.ts < intervalMs);
  windowMap.set(userId, trimmed);
  return trimmed;
}

async function punish(bot, message, type, reason, punishment) {
  const member = message.member;
  const guild = message.guild;
  if (!member || !guild) return;
  if (member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageGuild)) return;
  if (member.id === guild.ownerId) return;

  const cfg = bot.config.automod;
  const act = punishment || (cfg.autoTimeout ? 'timeout' : 'warn');
  try {
    if (act === 'timeout' && member.moderatable) {
      const ms = type === 'mention-spam' ? (cfg.mentionLimit.timeoutMs || 1800000) : cfg.spamFilter.timeoutMs || 600000;
      await member.timeout(ms, `Automod: ${reason}`);
    } else if (act === 'kick') {
      await member.kick(`Automod: ${reason}`);
    } else if (act === 'ban') {
      await member.ban({ reason: `Automod: ${reason}` });
    } else {
      await Warn.create({ guildId: bot.guildId, userId: member.id, moderatorId: bot.client.user.id, reason: `Automod: ${reason}` });
    }
    await createCase(bot, {
      guild, targetUserId: member.id, targetTag: member.user.tag, moderatorId: bot.client.user.id,
      type: 'automod', reason: `Automod/${type}: ${reason}`, active: false, durationMs: 0
    });
    await bot.log.log('AUTOMOD', type, { targetUserId: member.id, reason });
  } catch (err) {
    bot.logger.warn(`Automod punish hatası: ${err.message}`);
  }
  return { punished: true, act };
}

async function analyze(bot, message) {
  const cfg = bot.config.automod;
  if (!message.guild || message.author.bot || message.webhookId) return;
  const am = cfg;
  const memberPerms = message.member?.permissions;
  if (memberPerms && (memberPerms.has(PermissionFlagsBits.ManageMessages))) return;

  const content = message.content || '';
  // badword
  if (am.badWords.enabled) {
    for (const w of am.badWords.list) {
      const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(content)) {
        await message.delete().catch(() => {});
        return punish(bot, message, 'bad-word', w, am.badWords.punishment);
      }
    }
  }
  // invite
  if (am.inviteFilter.enabled && inviteRegex.test(content)) {
    if (am.inviteFilter.channelIds && am.inviteFilter.channelIds.includes(message.channel.id)) {
      // kanala davet linki paylaşılabiliyor
    } else {
      const chOk = am.inviteFilter.exemptChannelIds && am.inviteFilter.exemptChannelIds.includes(message.channel.id);
      if (!chOk) {
        await message.delete().catch(() => {});
        return punish(bot, message, 'invite', 'discord davet linki', am.inviteFilter.punishment);
      }
    }
  }
  // link
  if (am.linkFilter.enabled && linkRegex.test(content)) {
    if (!(am.linkFilter.whitelist || []).some((w) => content.includes(w))) {
      await message.delete().catch(() => {});
      return punish(bot, message, 'link', 'link filtresi', am.linkFilter.punishment);
    }
  }
  // mention limit
  if (am.mentionLimit.enabled && message.mentions.users.size >= am.mentionLimit.limit) {
    return punish(bot, message, 'mention-spam', `mention limit (${message.mentions.users.size}/${am.mentionLimit.limit})`, am.mentionLimit.punishment);
  }
  // caps spam
  const trimmed = content.replace(/\s+/g, '');
  if (am.capsDetection.enabled && trimmed.length >= am.capsDetection.minLength) {
    const upper = trimmed.replace(/[^A-Z]/g, '').length;
    if (upper / trimmed.length * 100 >= am.capsDetection.percent) {
      return punish(bot, message, 'caps-spam', 'cok fazla buyuk harf', am.capsDetection.punishment);
    }
  }
  // spam/flood
  const sf = am.spamFilter;
  if (sf.enabled) {
    const arr = pushWindow(message.author.id, message, sf.interval);
    if (arr.length >= sf.limit) {
      windowMap.set(message.author.id, []);
      return punish(bot, message, 'spam', `${arr.length} mesaj/${sf.interval / 1000}sn`, sf.punishment);
    }
    const repeated = arr.filter((e) => e.content === message.content && message.content.length > 3).length;
    if (am.repeatedMessages.enabled && repeated >= am.repeatedMessages.limit) {
      windowMap.set(message.author.id, []);
      return punish(bot, message, 'repeated', 'tekrarlanan mesaj', 'delete');
    }
  }
  // flood detections
  const fd = am.floodDetection;
  if (fd.enabled) {
    const arr = pushWindow(`${message.author.id}:fd`, message, fd.interval);
    if (arr.length >= fd.limit) {
      windowMap.set(`${message.author.id}:fd`, []);
      return punish(bot, message, 'flood', `${arr.length} mesaj/${fd.interval / 1000}sn`, 'timeout');
    }
  }
  // suspicious account
  const susAge = am.suspiciousAccount;
  if (susAge.enabled) {
    const ageDays = Math.floor((Date.now() - message.author.createdTimestamp) / 86400000);
    if (ageDays < susAge.accountAgeDays) {
      return punish(bot, message, 'suspicious-account', `yeni hesap ${ageDays} gun`, susAge.punishment);
    }
  }
}

module.exports = { inviteRegex, linkRegex, analyze, pushWindow, punish, windowMap };
