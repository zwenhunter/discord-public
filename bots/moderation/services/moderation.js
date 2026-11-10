'use strict';
const { PermissionFlagsBits } = require('discord.js');
const { Case, Warn } = require('../../../shared/models');
const { ValidationError, validSnowflake } = require('../../../shared/utils/helpers');
const { resolveMember } = require('../../../shared/utils/resolve');

// CaseID generator
const counters = new Map();
async function nextCaseId(bot) {
  if (!counters.has(bot.guildId)) {
    const last = await Case.findOne({ guildId: bot.guildId }).sort({ caseId: -1 }).lean();
    counters.set(bot.guildId, last ? last.caseId : 0);
  }
  const v = counters.get(bot.guildId) + 1;
  counters.set(bot.guildId, v);
  return v;
}

function invalidHier(bot, guild, moderator, targetMember) {  // rol hiyerarşisi: moderasyon yapan kişinin en yüksek rolu, hedefin en yüksek rolunden yukarda olmalı
  if (!targetMember) return false;
  if (guild.ownerId === targetMember.id) return true;
  const modTop = moderator.roles.highest.rawPosition;
  const targetTop = targetMember.roles.highest.rawPosition;
  const botMember = guild.members.me;
  if (!botMember.permissions.has(PermissionFlagsBits.Administrator) && targetMember.roles.highest.rawPosition >= botMember.roles.highest.rawPosition) return true;
  return targetTop >= modTop;
}

async function createCase(bot, { guild, targetUserId, targetTag, moderatorId, type, reason = '', durationMs = 0, active = true, removedRoles = [] }) {
  const caseId = await nextCaseId(bot);
  const doc = await Case.create({
    guildId: bot.guildId,
    caseId,
    targetUserId,
    targetTag,
    moderatorId,
    type,
    reason,
    durationMs,
    active,
    data: { removedRoles },
    ...(durationMs ? { expiresAt: new Date(Date.now() + durationMs) } : { expiresAt: null })
  });
  await bot.log.postgresLog?.('MODERATION', type, { targetUserId, moderatorId, reason, caseId });
  await bot.log.log('MODERATION', `case_${type}`, { targetUserId, moderatorId, reason, caseId, durationMs });
  return doc;
}

async function sendModLog(bot, guild, caseDoc) {
  if (!bot.logChannel) return;
  const channel = guild.channels.cache.get(bot.logChannel);
  if (!channel) return;
  const emb = {
    title: `Case #${caseDoc.caseId} - ${caseDoc.type}`,
    color: 0xed4245,
    fields: [
      { name: 'Hedef', value: `<@${caseDoc.targetUserId}> (${caseDoc.targetTag || caseDoc.targetUserId})`, inline: true },
      { name: 'Moderator', value: `<@${caseDoc.moderatorId}>`, inline: true },
      { name: 'Sure', value: caseDoc.durationMs ? `${caseDoc.durationMs / 1000} sn` : 'Kalici', inline: true },
      { name: 'Sebep', value: caseDoc.reason || '-' }
    ],
    timestamp: new Date()
  };
  const { EmbedBuilder } = require('discord.js');
  await channel.send({ embeds: [new EmbedBuilder(emb)] }).catch(() => {});
}

// iste bubble değişimi: geçerli moderaasyonun ortak yildan mı mı keydeder olucar
async function safePunish(bot, message, targetStr, action, fn) {
  const targetMember = await resolveMember(bot.client, message.guild, targetStr);
  const targetUser = targetMember ? targetMember.user : null;
  if (!targetMember && !targetUser) {
    const { resolveUser } = require('../../../shared/utils/resolve');
    const u = await resolveUser(targetStr, bot.client);
    if (!u) throw new ValidationError('Kullanici bulunamadi.', `.action <kullanici> [sure] [sebep]`);
  }
  if (invalidHier(bot, message.guild, message.member, targetMember)) {
    throw new ValidationError('Hedef rol hiyerarşisinde senden yukarda.', `.action <kullanici>`);
  }
  const result = await fn(targetMember, targetUser);
  return { targetMember, targetUser, result };
}

module.exports = { nextCaseId, createCase, sendModLog, invalidHier: invalidHier, safePunish, counters, modInvalidHier: invalidHier };
