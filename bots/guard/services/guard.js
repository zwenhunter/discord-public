'use strict';

/**
 * GUARD BOT CORE LOGIC
 * - Anti-nuke (audit log eşleştirmesi + botun kendi işlemlerini ayırt etme)
 * - Anti-raid (join flood + hesap yaşı + lockdown)
 * - Anti-spam (flood/mention/invite/link/caps/emoji/attachment)
 * - Yetkili güvenliği (whitelist, trusted users/roles/bots)
 */
const { PermissionFlagsBits } = require('discord.js');
const { AuditLogEvent } = require('discord.js');
const { CacheManager } = require('../../../shared/cache');
const { escapeRegex, sleep } = require('../../../shared/utils/helpers');
const { MessageStat } = require('../../../shared/models');

// Sayaç penceresi: restart sonrası da anlamlı olsun diye 10dk saklanır
const COUNTER_WINDOW_MS = 600000;

// Memory state (resetten sonra audit log id'lerinden devam eder)
let state = null;

function stripEmojisFromKey(text) {
  if (!text) return '';
  // sadece audit log executor'ının üye ID'si vs; raw text
  return text;
}

function init(bot) {
  state = {
    bot,
    auditCache: new Map(), // key -> executor
    spamWindow: new Map(), // userId -> [{ ts, content }]
    joinWindow: new Map(), // ts array
    lockdownActive: false,
    lockdownUntil: 0,
    securityActions: new Map(), // executorId -> [{ ts, severity }]
    selfActionLog: new Map(), // auditId vs
    antiNukeCounters: {},
    deletedChannels: new Map(),
    deletedRoles: new Map()
  };
  // embeded bot init hook
  bot.guardState = state;
}

// --- Sayaç kalıcılığı (Mongo) ---
async function loadCounters(bot) {
  const { NukeCounter } = require('../../../shared/models');
  const now = Date.now();
  const docs = await NukeCounter.find({ guildId: bot.guildId }).lean();
  for (const doc of docs) {
    const fresh = (doc.timestamps || []).filter((ts) => ts > now - COUNTER_WINDOW_MS);
    if (fresh.length) state.antiNukeCounters[doc.key] = fresh;
  }
  bot.logger.info(`Nuke sayaçları yüklendi: ${Object.keys(state.antiNukeCounters).length} kayıt`);
}

async function flushCounters(bot) {
  const { NukeCounter } = require('../../../shared/models');
  const now = Date.now();
  const ops = [];
  for (const [key, arr] of Object.entries(state.antiNukeCounters || {})) {
    const fresh = arr.filter((ts) => ts > now - COUNTER_WINDOW_MS);
    if (!fresh.length) continue;
    ops.push({
      updateOne: {
        filter: { guildId: bot.guildId, key },
        update: { $set: { timestamps: fresh } },
        upsert: true
      }
    });
  }
  if (ops.length) await NukeCounter.bulkWrite(ops);
  return ops.length;
}

async function isInWhitelist(bot, executorId) {
  if (!executorId) return true; // bir botun kendisi veya sistem
  if (executorId === bot.client.user.id) return true;
  const owners = bot.global?.ownerIds || [];
  if (owners.includes(executorId)) return true;
  const wl = bot.config.whitelist || [];
  if (wl.includes(executorId)) return true;
  // trusted role
  const trustedRoles = bot.config.trustedRoles || [];
  const guild = bot.client.guilds.cache.get(bot.guildId);
  if (guild) {
    try {
      const member = await bot.client.ecosystem.safeMember(guild, executorId);
      if (member && trustedRoles.some((r) => member.roles.cache.has(r))) return true;
    } catch { /* yok */ }
  }
  // trusted bot
  const trustedBots = bot.config.trustedBots || [];
  if (trustedBots.includes(executorId)) return true;
  return false;
}

// --- Audit log eslestirme helpers ---
async function getAuditExecutor(bot, auditEvent) {
  // son dalamediğini blank getirdi
  await sleep(bot.config.antiNuke?.auditLogDelayMs ?? 1500);
  const guild = bot.client.guilds.cache.get(bot.guildId);
  if (!guild || !auditEvent) return null;
  try {
    const logs = await guild.fetchAuditLogs({ type: auditEvent, limit: 10 });
    if (!logs.entries.size) return null;
    // güncel olanısa filter (botun kendi sistemi hariç)
    const entry = logs.entries.first();
    return entry;
  } catch {
    return null;
  }
}

async function recordSecurityAction(executorId, type, severity) {
  const now = Date.now();
  const arr = (state.securityActions.get(executorId) || []).filter((a) => a.ts > now - 300000);
  arr.push({ ts: now, type, severity });
  state.securityActions.set(executorId, arr);
  return arr;
}

async function logSecurityEvent(type, payload) {
  const { SecurityEvent, GuildLog } = require('../../../shared/models');
  await GuildLog.create({
    guildId: payload.guildId,
    bot: 'guard',
    category: 'SECURITY',
    type,
    userId: payload.executorId,
    targetId: payload.targetId,
    data: payload
  });
  await SecurityEvent.create({
    guildId: payload.guildId,
    type,
    executorId: payload.executorId,
    targetId: payload.targetId,
    data: payload
  });
}

// --- Punishment ---
async function punish(bot, executorId, member, type, reason, severity) {
  await recordSecurityAction(executorId, reason, severity);
  const guild = bot.client.guilds.cache.get(bot.guildId);
  if (!guild || !member) return false;
  try {
    if (bot.config.antiNuke?.punishment === 'ban' && guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      await member.ban({ reason: reason.slice(0, 250) });
      return 'ban';
    } else if (bot.config.antiNuke?.punishment === 'timeout' && guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await member.timeout(600000, reason.slice(0, 250));
      return 'timeout';
    } else {
      return null;
    }
  } catch (err) {
    bot.logger.error(`Punish hata: ${err.message}`);
    return null;
  }
}

// --- Restore helpers (silme olaylarını geri dress) ---
async function restoreChannel(bot, oldChannel, executorId) {
  const guild = bot.client.guilds.cache.get(bot.guildId);
  if (!guild) return null;
  try {
    const permissions = oldChannel.permissionOverwrites ? { overwrites: oldChannel.permissionOverwrites.cache.map((p) => ({ id: p.id, allow: p.allow, deny: p.deny, type: p.type })) } : {};
    const restored = await guild.channels.create({
      name: oldChannel.name,
      type: oldChannel.type,
      topic: oldChannel.topic || undefined,
      parent: oldChannel.parentId || undefined,
      position: oldChannel.rawPosition || undefined,
      ...permissions
    });
    return restored;
  } catch (err) {
    bot.logger.error(`restoreChannel hata: ${err.message}`);
    return null;
  }
}

async function restoreRole(bot, oldRole, executorId) {
  const guild = bot.client.guilds.cache.get(bot.guildId);
  if (!guild) return null;
  try {
    const permissions = {}; // oldRole.permissions map
    const restored = await guild.roles.create({
      name: oldRole.name,
      color: oldRole.color,
      permissions: oldRole.permissions,
      mentionable: oldRole.mentionable,
      hoist: oldRole.hoist,
      position: undefined // Discord otomatik ekler
    });
    return restored;
  } catch (err) {
    bot.logger.error(`restoreRole hata: ${err.message}`);
    return null;
  }
}

// --- Anti-nuke funcs ---
async function handleChannelDelete(channel) {
  const bot = state.bot;
  const cfg = bot.config.antiNuke.channelDelete;
  if (!channel.guild || channel.guild.id !== bot.guildId) return;

  // wait auditlog
  await sleep(bot.config.antiNuke.auditLogDelayMs ?? 1500);
  const guild = channel.guild;
  let executorId = null;
  let entry = null;
  try {
    const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 5 });
    entry = logs.entries.first();
    const delay = Date.now() - new Date(entry.createdAt).getTime();
    if (entry && delay < 30000) {
      executorId = entry.executorId;
    }
    if (entry && delay > 30000) executorId = null;
  } catch { /* yok */ }

  if (!executorId || executorId === bot.client.user.id) {
    if (cfg.restore) await autoRestoreChannel(bot, channel.id).catch(() => {});
    return;
  }

  if (await isInWhitelist(bot, executorId)) return;

  const violations = (state.antiNukeCounters ??= {});
  const key = `channelDelete:${executorId}`;
  const now = Date.now();
  const arr = (violations[key] || []).filter((ts) => ts > now - cfg.interval);
  arr.push(now);
  violations[key] = arr;
  if (arr.length >= cfg.limit) {
    const member = await bot.client.ecosystem.safeMember(guild, executorId);
    const punishResult = cfg.punish && !await isInWhitelist(bot, executorId)
      ? await punish(bot, executorId, member, 'ban', `Anti-nuke: çok fazla kanal silme (${arr.length}/${cfg.limit})`)
      : null;
    if (cfg.restore) delete state.deletedChannels?.get(channel.id);
    await logSecurityEvent('channel_delete_nuke', { guildId: guild.id, executorId, targetId: channel.id, count: arr.length, punishResult });
    violations[key] = [];
  } else {
    if (cfg.restore) {
      state.deletedChannels = state.deletedChannels || new Map();
      state.deletedChannels.set(channel.id, channel);
    }
    if (cfg.restore) await autoRestoreChannel(bot, channel.id).catch(() => {});
  }
}

async function handleChannelCreate(channel) {
  const bot = state.bot;
  const cfg = bot.config.antiNuke.channelCreate;
  if (!channel.guild || channel.guild.id !== bot.guildId) return;
  await sleep(bot.config.antiNuke.auditLogDelayMs ?? 1500);
  let executorId = null;
  try {
    const logs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelCreate, limit: 5 });
    const entry = logs.entries.first();
    if (entry && Date.now() - new Date(entry.createdAt).getTime() < 30000 && entry.executorId !== bot.client.user.id) executorId = entry.executorId;
  } catch { /* yok */ }
  if (!executorId || await isInWhitelist(bot, executorId)) return;
  const guild = channel.guild;
  const violations = state.antiNukeCounters ??= {};
  const key = `channelCreate:${executorId}`;
  const now = Date.now();
  const arr = (violations[key] || []).filter((ts) => ts > now - cfg.interval);
  arr.push(now);
  violations[key] = arr;
  if (arr.length >= cfg.limit) {
    const member = await bot.client.ecosystem.safeMember(guild, executorId);
    if (cfg.punish) await punish(bot, executorId, member, 'kick', `Anti-nuke: çok fazla kanal oluşturma`);
    await logSecurityEvent('channel_create_nuke', { guildId: guild.id, executorId, targetId: channel.id, count: arr.length });
    violations[key] = [];
  }
}

async function handleRoleDelete(role) {
  const bot = state.bot;
  const cfg = bot.config.antiNuke.roleDelete;
  if (role.guild.id !== bot.guildId) return;
  await sleep(bot.config.antiNuke.auditLogDelayMs ?? 1500);
  let executorId = null;
  try {
    const logs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 5 });
    const entry = logs.entries.first();
    if (entry && Date.now() - new Date(entry.createdAt).getTime() < 30000 && entry.executorId !== bot.client.user.id) executorId = entry.executorId;
  } catch { /* yok */ }
  if (!executorId || await isInWhitelist(bot, executorId)) {
    if (cfg.restore) await autoRestoreRole(bot, role.id).catch(() => {});
    return;
  }
  const guild = role.guild;
  const violations = (state.antiNukeCounters ??= {});
  const key = `roleDelete:${executorId}`;
  const now = Date.now();
  const arr = (violations[key] || []).filter((ts) => ts > now - cfg.interval);
  arr.push(now);
  violations[key] = arr;
  if (arr.length >= cfg.limit) {
    const member = await bot.client.ecosystem.safeMember(guild, executorId);
    if (cfg.punish) await punish(bot, executorId, member, 'ban', `Anti-nuke: çok fazla rol silme`);
    await logSecurityEvent('role_delete_nuke', { guildId: guild.id, executorId, targetId: role.id, count: arr.length });
    violations[key] = [];
  } else {
    if (cfg.restore) {
      state.deletedRoles = state.deletedRoles || new Map();
      state.deletedRoles.set(role.id, role);
    }
    if (cfg.restore) await autoRestoreRole(bot, role.id).catch(() => {});
  }
}

async function handleRoleUpdate(oldRole, newRole) {
  const bot = state.bot;
  const cfg = bot.config.antiNuke.roleUpdate;
  // Dangerous permission escalation check
  const dp = bot.config.antiNuke.dangerousPermissions;
  const escalated = dp.some((p) => newRole.permissions.has(PermissionFlagsBits[p]) && !oldRole.permissions.has(PermissionFlagsBits[p]));
  if (!escalated && oldRole.rawPosition === newRole.rawPosition && oldRole.name === newRole.name) return;

  await sleep(bot.config.antiNuke.auditLogDelayMs ?? 1500);
  let executorId = null;
  try {
    const logs = await newRole.guild.fetchAuditLogs({ type: AuditLogEvent.RoleUpdate, limit: 5 });
    const entry = logs.entries.first();
    if (entry && Date.now() - new Date(entry.createdAt).getTime() < 30000 && entry.executorId !== bot.client.user.id) executorId = entry.executorId;
  } catch { /* yok */ }
  if (!executorId || await isInWhitelist(bot, executorId)) return;

  if (escalated) await logSecurityEvent('role_escalation', { guildId: newRole.guild.id, executorId, targetId: newRole.id });
  const guild = newRole.guild;
  const key = `roleUpdate:${executorId}`;
  const violations = state.antiNukeCounters ??= {};
  const now = Date.now();
  const arr = (violations[key] || []).filter((ts) => ts > now - cfg.interval);
  arr.push(now);
  violations[key] = arr;
  if ((cfg.punish || escalated) && arr.length >= cfg.limit) {
    const member = await bot.client.ecosystem.safeMember(guild, executorId);
    if (cfg.punish) await punish(bot, executorId, member, 'timeout', `Anti-nuke: çok fazla rol güncelleme`);
    violations[key] = [];
  }
}

async function handleGuildBanAdd(ban) {
  const bot = state.bot;
  const cfg = bot.config.antiNuke.ban;
  if (ban.guild.id !== bot.guildId) return;
  await sleep(bot.config.antiNuke.auditLogDelayMs ?? 1500);
  let executorId = null;
  try {
    const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBan, limit: 5 });
    const entry = logs.entries.first();
    if (entry && Date.now() - new Date(entry.createdAt).getTime() < 30000 && entry.executorId !== bot.client.user.id) executorId = entry.executorId;
  } catch { /* yok */ }
  if (!executorId || await isInWhitelist(bot, executorId)) return;
  const key = `ban:${executorId}`;
  const violations = state.antiNukeCounters ??= {};
  const now = Date.now();
  const arr = (violations[key] || []).filter((ts) => ts > now - cfg.interval);
  arr.push(now);
  violations[key] = arr;
  if (arr.length >= cfg.limit) {
    const member = await bot.client.ecosystem.safeMember(ban.guild, executorId);
    if (cfg.punish) await punish(bot, executorId, member, 'ban', `Anti-nuke: Mas ban`);
    await logSecurityEvent('ban_nuke', { guildId: ban.guild.id, executorId, targetId: ban.user.id, count: arr.length });
    violations[key] = [];
  }
}

async function handleGuildMemberRemove(member) {
  const bot = state.bot;
  const cfg = bot.config.antiNuke.kick;
  if (member.guild.id !== bot.guildId) return;
  // kick audit
  await sleep(bot.config.antiNuke.auditLogDelayMs ?? 1500);
  let executorId = null;
  try {
    const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 5 });
    const entry = logs.entries.first();
    if (entry && Date.now() - new Date(entry.createdAt).getTime() < 30000 && entry.executorId !== bot.client.user.id) executorId = entry.executorId;
  } catch { /* yok */ }
  if (!executorId || await isInWhitelist(bot, executorId)) return;
  const key = `kick:${executorId}`;
  const violations = state.antiNukeCounters ??= {};
  const now = Date.now();
  const arr = (violations[key] || []).filter((ts) => ts > now - cfg.interval);
  arr.push(now);
  violations[key] = arr;
  if (arr.length >= cfg.limit) {
    const punisher = await bot.client.ecosystem.safeMember(member.guild, executorId);
    if (cfg.punish) await punish(bot, executorId, punisher, 'timeout', `Anti-nuke: Mas kick`);
    await logSecurityEvent('kick_nuke', { guildId: member.guild.id, executorId, targetId: member.id, count: arr.length });
    violations[key] = [];
  }
}

async function handleRoleCreate(role) {
  const bot = state.bot;
  const cfg = bot.config.antiNuke.roleCreate;
  if (role.guild.id !== bot.guildId) return;
  await sleep(bot.config.antiNuke.auditLogDelayMs ?? 1500);
  let executorId = null;
  try {
    const logs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleCreate, limit: 5 });
    const entry = logs.entries.first();
    if (entry && Date.now() - new Date(entry.createdAt).getTime() < 30000 && entry.executorId !== bot.client.user.id) executorId = entry.executorId;
  } catch { /* yok */ }
  if (!executorId || await isInWhitelist(bot, executorId)) return;
  const guild = role.guild;
  const violations = state.antiNukeCounters ??= {};
  const key = `roleCreate:${executorId}`;
  const now = Date.now();
  const arr = (violations[key] || []).filter((ts) => ts > now - cfg.interval);
  arr.push(now);
  violations[key] = arr;
  if (arr.length >= cfg.limit) {
    const member = await bot.client.ecosystem.safeMember(guild, executorId);
    if (cfg.punish) await punish(bot, executorId, member, 'timeout', `Anti-nuke: çok fazla rol oluşturma`);
    await logSecurityEvent('role_create_nuke', { guildId: guild.id, executorId, targetId: role.id, count: arr.length });
    violations[key] = [];
  }
}

async function handleWebhookChange(oldWebhook, newWebhook, kindOverride) {
  const bot = state.bot;
  const kind = kindOverride || (oldWebhook ? 'update' : 'create');
  const events = { create: AuditLogEvent.WebhookCreate, update: AuditLogEvent.WebhookUpdate, delete: AuditLogEvent.WebhookDelete };
  const auditType = events[kind];
  const target = kind === 'delete' ? (oldWebhook || newWebhook) : (newWebhook || oldWebhook);
  const cfg = kind === 'create' ? bot.config.antiNuke.webhookCreate : kind === 'update' ? bot.config.antiNuke.webhookUpdate : bot.config.antiNuke.webhookDelete;
  if (target.guild?.id !== bot.guildId) return;
  await sleep(bot.config.antiNuke.auditLogDelayMs ?? 1500);
  let executorId = null;
  try {
    const logs = await target.guild.fetchAuditLogs({ type: auditType, limit: 5 });
    const entry = logs.entries.first();
    if (entry && Date.now() - new Date(entry.createdAt).getTime() < 30000 && entry.executorId !== bot.client.user.id) executorId = entry.executorId;
  } catch { /* yok */ }
  if (!executorId || await isInWhitelist(bot, executorId)) return;
  const key = `webhook${kind}:${executorId}`;
  const violations = state.antiNukeCounters ??= {};
  const now = Date.now();
  const arr = (violations[key] || []).filter((ts) => ts > now - cfg.interval);
  arr.push(now);
  violations[key] = arr;
  if (arr.length >= cfg.limit) {
    const member = await bot.client.ecosystem.safeMember(target.guild, executorId);
    await punish(bot, executorId, member, 'timeout', `Anti-nuke: çok fazla webhook ${kind}`);
    await logSecurityEvent(`webhook_${kind}_nuke`, { guildId: target.guild.id, executorId, targetId: target.id, count: arr.length });
    violations[key] = [];
  }
}

async function handleBotAdd(member) {
  const bot = state.bot;
  if (member.guild.id !== bot.guildId) return;
  await sleep(bot.config.antiNuke.auditLogDelayMs ?? 1500);
  let executorId = null;
  try {
    const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd, limit: 5 });
    const entry = logs.entries.first();
    if (entry && Date.now() - new Date(entry.createdAt).getTime() < 30000 && entry.executorId !== bot.client.user.id) executorId = entry.executorId;
  } catch { /* yok */ }
  if (!executorId || await isInWhitelist(bot, executorId)) return;
  if (bot.config.antiNuke.botAdd.punish) {
    // otomatik bot kick, ama whitelist'e eklerden sayılmaz
    try {
      await member.kick('Anti-nuke: İzinsiz bot ekleme');
    } catch { /* yok */ }
    await logSecurityEvent('bot_add', { guildId: member.guild.id, executorId, targetId: member.id, action: 'kick' });
  }
  if (bot.config.antiNuke.botAdd.requireApproval) {
    await logSecurityEvent('bot_add_pending_approval', { guildId: member.guild.id, executorId, targetId: member.id });
  }
}

// --- Anti-raid ---
async function handleGuildMemberAdd(member) {
  const bot = state.bot;
  const cfg = bot.config.antiRaid.joinFlood;
  if (member.guild.id !== bot.guildId) return;

  const now = Date.now();
  const arr = (state.raidCounters?.get('join') || []).filter((t) => t > now - cfg.interval);
  arr.push(now);
  state.raidCounters = new Map([...(state.raidCounters || [])]);
  state.raidCounters.set('join', arr);
  await logSecurityEvent('member_join', { guildId: member.guild.id, executorId: member.id, targetId: member.id });

  // account age check
  const ageDays = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);
  if (ageDays < (bot.config.antiRaid.accountAgeDays ?? 7) && !state.lockdownActive) {
    const action = bot.config.antiRaid.suspiciousAction || 'quarantine';
    if (action === 'kick') {
      await member.kick(`Yeni hesap girişi engellendi (${ageDays} gün)`).catch(() => {});
    } else if (action === 'quarantine') {
      const roleId = bot.config.antiRaid.quarantineRoleId;
      if (roleId) {
        await member.roles.add(roleId, `Şüpheli hesap karantinası (${ageDays} gün)`).catch(() => {});
        // karantinadayken konuşma kanallarını kapatan rol olması beklenir
      } else {
        bot.logger.warn('quarantineRoleId ayarlanmamış, şüpheli hesap sadece loglandı');
      }
    }
    await logSecurityEvent('account_age_rejection', { guildId: member.guild.id, executorId: member.id, targetId: member.id, ageDays, action });
  }

  if (arr.length >= cfg.limit && !state.lockdownActive) {
    await activateLockdown(bot, 'join-flood tespit edildi (mas join detected)');
  }
}

async function activateLockdown(bot, reason) {
  if (state.lockdownActive && Date.now() < state.lockdownUntil) return;
  const guild = bot.client.guilds.cache.get(bot.guildId);
  if (!guild) return;
  await guild.channels.cache.filter((c) => c.type === 0 || c.type === 5).forEach(async (c) => {
    try {
      await c.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
    } catch { /* yok */ }
  });
  state.lockdownActive = true;
  state.lockdownUntil = Date.now() + (bot.config.antiRaid.lockdownDurationMs ?? 300000);
  await logSecurityEvent('lockdown_activated', { guildId: guild.id, reason });
  if (bot.config.antiRaid.autoUnlock) {
    setTimeout(async () => {
      await deactivateLockdown(bot, 'auto-unlock');
    }, bot.config.antiRaid.lockdownDurationMs ?? 300000);
  }
}

async function deactivateLockdown(bot, reason) {
  const guild = bot.client.guilds.cache.get(bot.guildId);
  if (!guild) return;
  await guild.channels.cache.filter((c) => c.type === 0 || c.type === 5).forEach(async (c) => {
    try {
      await c.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
    } catch { /* yok */ }
  });
  state.lockdownActive = false;
  await logSecurityEvent('lockdown_deactivated', { guildId: guild.id, reason });
}

// --- Anti-spam ---
const inviteRegex = /(?:discord\.gg|discordapp\.com\/invite|discord\.com\/invite)\/[\w-]+/i;
const linkRegex = /(https?:\/\/)[^\s]+/i;

async function handleMessageCreate(message) {
  const bot = state.bot;
  if (message.webhookId || message.author.bot) return;
  if (message.guild?.id !== bot.guildId) return;

  const as = bot.config.antiSpam;
  const now = Date.now();
  const userId = message.author.id;
  const key = userId;
  const arr = (state.spamWindow.get(key) || []).filter((e) => now - e.ts < as.messageFlood.interval);
  arr.push({ ts: now, content: message.content || '', attachments: message.attachments.size, mentions: message.mentions.users.size, emojis: ((message.content || '').match(/<(a)?:[\w]+:\d+>/g) || []).length });
  state.spamWindow.set(key, arr);

  // message flood
  if (arr.length >= as.messageFlood.limit) {
    state.spamWindow.set(key, []);
    return performSpamAction(bot, message.author.id, 'Flood', 'message-flood');
  }
  // mention spam
  if (message.mentions.users.size >= as.mentionSpam.limit) {
    return performSpamAction(bot, message.author.id, 'Mention flood', 'mention-spam');
  }
  // invite spam
  if (as.inviteSpam.enabled && inviteRegex.test(message.content)) {
    const whitelistedInvite = message.content.match(inviteRegex);
    state.inviteWarn = state.inviteWarn || new Map();
    const count = (state.inviteWarn.get(userId) || 0) + 1;
    state.inviteWarn.set(userId, count);
    if (count > 3) {
      state.inviteWarn.set(userId, 0);
      return performSpamAction(bot, message.author.id, 'Invite spam', 'invite-spam');
    }
    return;
  }
  // link spam - is enabled?
  if (as.linkSpam.enabled && linkRegex.test(message.content)) {
    if (!as.linkSpam.whitelist.some((w) => message.content.includes(w))) {
      return performSpamAction(bot, message.author.id, 'Link spam', 'link-spam');
    }
  }
  // caps spam
  const text = message.content.replace(/\s/g, '');
  if (text.length >= as.capsSpam.minLength) {
    const caps = text.replace(/[^A-ZÇĞİÖŞÜ]/g, '').length / text.length;
    if (caps * 100 >= as.capsSpam.percent) {
      return performSpamAction(bot, message.author.id, 'Caps spam', 'caps-spam');
    }
  }
  // emoji spam
  const emojis = (message.content.match(/<(a)?:[\w]+:\d+>/g) || []).length;
  if (emojis >= as.emojiSpam.limit) {
    return performSpamAction(bot, message.author.id, 'Emoji spam', 'emoji-spam');
  }
  // attachment spam
  const attachmentCount = message.attachments.size;
  if (attachmentCount >= as.attachmentSpam.limit) {
    return performSpamAction(bot, message.author.id, 'Attachment spam', 'attachment-spam');
  }
  // repeated messages
  const sameRepeat = arr.filter((e) => e.content == message.content && message.content.length > 3).length;
  if (as.repeatedMessages.enabled && sameRepeat >= as.repeatedMessages.limit) {
    state.spamWindow.set(key, []);
    return performSpamAction(bot, message.author.id, 'Mesaj tekrarı', 'repeated');
  }
}

async function performSpamAction(bot, userId, reason, type) {
  const guild = bot.client.guilds.cache.get(bot.guildId);
  if (!guild) return;
  const member = await bot.client.ecosystem.safeMember(guild, userId);
  if (!member) return;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return;
  if (await isInWhitelist(bot, userId)) return;

  try {
    if (bot.config.antiSpam.punishment === 'timeout' && guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await member.timeout(bot.config.antiSpam.timeoutMs, `${reason}: Spam eylemi`);
    } else if (bot.config.antiSpam.punishment === 'kick') {
      await member.kick(`Spam: ${reason}`);
    } else if (bot.config.antiSpam.punishment === 'ban') {
      await member.ban({ reason: `Spam: ${reason}` });
    }
    await logSecurityEvent(`spam_${type.replace(/-/g, '_')}`, { guildId: guild.id, executorId: userId, targetId: userId, type, reason });
  } catch (err) {
    bot.logger.error(`Spam punish hatası: ${err.message}`);
  }
}

// ek işler: whitelist onay sistemi
async function requestSecurityApproval({ bot, clientId, targetId, reason }) {
  const { SecurityEvent, GuildLog } = require('../../../shared/models');
  const evt = await SecurityEvent.create({ guildId: bot.guildId, type: 'approval_request', executorId: clientId, targetId, data: { reason } });
  await logSecurityEvent('approval_request', { guildId: bot.guildId, executorId: clientId, targetId, reason, id: evt._id });
  return evt;
}

async function approveSecurityAction(bot, originalId, approverId) {
  const { SecurityEvent, GuildLog } = require('../../../shared/models');
  const evt = await SecurityEvent.findById(originalId);
  if (!evt) return null;
  evt.approved = true;
  await evt.save();
  await logSecurityEvent('approval_granted', { guildId: bot.guildId, executorId: approverId, targetId: evt.executorId, reason: `Onay: ${evt._id}` });
  return evt;
}

// --- Backup sistemi (rol + kanal snapshot, DB kalıcı) ---
async function takeBackup(bot, reason = 'manual') {
  const { GuildBackup } = require('../../../shared/models');
  const guild = bot.client.guilds.cache.get(bot.guildId);
  if (!guild) return null;

  const roles = guild.roles.cache
    .filter((r) => !r.managed && r.id !== guild.id && r.editable)
    .map((r) => ({
      id: r.id, name: r.name, color: r.color, hoist: r.hoist,
      permissions: r.permissions.bitfield.toString(), mentionable: r.mentionable,
      members: r.members.map((m) => m.id),
      channelOverwrites: guild.channels.cache
        .filter((c) => c.permissionOverwrites?.cache.has(r.id))
        .map((c) => {
          const p = c.permissionOverwrites.cache.get(r.id);
          return { channelId: c.id, allow: p.allow.bitfield.toString(), deny: p.deny.bitfield.toString(), type: p.type };
        })
        .filter(Boolean)
    }));

  const categories = guild.channels.cache
    .filter((c) => c.type === 4)
    .map((c) => ({ id: c.id, name: c.name, position: c.rawPosition }));

  const overwritesOf = (c) => c.permissionOverwrites?.cache.map((p) => ({
    id: p.id, allow: p.allow.bitfield.toString(), deny: p.deny.bitfield.toString(), type: p.type
  })) || [];

  const textChannels = guild.channels.cache
    .filter((c) => c.type === 0 || c.type === 5)
    .map((c) => ({ id: c.id, name: c.name, parentID: c.parentId, position: c.rawPosition, nsfw: c.nsfw, rateLimit: c.rateLimitPerUser ?? 0, topic: c.topic || '', overwrites: overwritesOf(c) }));

  const voiceChannels = guild.channels.cache
    .filter((c) => c.type === 2)
    .map((c) => ({ id: c.id, name: c.name, parentID: c.parentId, position: c.rawPosition, bitrate: c.bitrate, userLimit: c.userLimit, overwrites: overwritesOf(c) }));

  return GuildBackup.create({ guildId: bot.guildId, reason, roles, categories, textChannels, voiceChannels });
}

async function listBackups(bot, limit = 5) {
  const { GuildBackup } = require('../../../shared/models');
  return GuildBackup.find({ guildId: bot.guildId }).sort({ takenAt: -1 }).limit(limit);
}

// En son yedekten bir rol geri kurar: rol yeniden oluşturulur, izinler
// ve üyeler verilir. Kalan işi chunked ve paralel yapar.
async function restoreRoleFromBackup(bot, roleId) {
  const { GuildBackup, GuildLog } = require('../../../shared/models');
  const guild = bot.client.guilds.cache.get(bot.guildId);
  if (!guild) return null;
  const backup = await GuildBackup.findOne({ guildId: bot.guildId, 'roles.id': roleId }).sort({ takenAt: -1 });
  if (!backup) return null;
  const data = backup.roles.find((r) => r.id === roleId);
  if (!data) return null;

  let restored;
  try {
    restored = await guild.roles.create({
      name: data.name,
      color: data.color || undefined,
      hoist: data.hoist,
      mentionable: data.mentionable,
      permissions: BigInt(data.permissions || '0') // veri yoksa @everyone
    });
  } catch (err) {
    bot.logger.error(`restoreRoleFromBackup: rol oluşturulamadı: ${err.message}`);
    return null;
  }

  // kanal izinleri geri yükle
  for (const ov of data.channelOverwrites) {
    const channel = guild.channels.cache.get(ov.channelId);
    if (!channel) continue;
    try {
      await channel.permissionOverwrites.edit(restored, {
        allow: BigInt(ov.allow || '0'),
        deny: BigInt(ov.deny || '0')
      });
    } catch { /* yok */ }
  }

  // üyeleri dağıt (rate-limit dostu: paralel chunk)
  const memberIds = data.members.filter(Boolean);
  const CHUNK = 25;
  let assigned = 0;
  for (let i = 0; i < memberIds.length; i += CHUNK * 5) {
    const batch = memberIds.slice(i, i + CHUNK * 5);
    await Promise.all(batch.map(async (id) => {
      const member = await bot.client.ecosystem.safeMember(guild, id).catch(() => null);
      if (member) { await member.roles.add(restored.id).catch(() => {}); assigned += 1; }
    }));
  }

  await logSecurityEvent('backup_role_restored', {
    guildId: guild.id, executorId: bot.client.user.id, targetId: restored.id,
    fromRoleId: roleId, name: data.name, assigned
  });
  await GuildLog.create({ guildId: bot.guildId, bot: 'guard', category: 'BACKUP', type: 'role_restore', targetId: restored.id, data: { fromNodeId: roleId, assigned } });
  return { role: restored, assigned };
}

// En son yedekten bir kanal geri kurar (metin/ses/kategori fark etmez).
async function restoreChannelFromBackup(bot, channelId) {
  const { GuildBackup } = require('../../../shared/models');
  const guild = bot.client.guilds.cache.get(bot.guildId);
  if (!guild) return null;
  const backup = await GuildBackup.findOne({
    guildId: bot.guildId,
    $or: [
      { 'textChannels.id': channelId },
      { 'voiceChannels.id': channelId },
      { 'categories.id': channelId }
    ]
  }).sort({ takenAt: -1 });
  if (!backup) return null;

  const tdata = backup.textChannels.find((x) => x.id === channelId);
  const vdata = backup.voiceChannels.find((x) => x.id === channelId);
  const cdata = backup.categories.find((x) => x.id === channelId);
  const data = cdata || tdata || vdata;
  if (!data) return null;

  const isCategory = Boolean(cdata);
  const isVoice = Boolean(vdata);
  let restored;
  try {
    if (isCategory) {
      restored = await guild.channels.create({ name: data.name, type: 4 });
    } else if (isVoice) {
      restored = await guild.channels.create({
        name: data.name, type: 2,
        bitrate: data.bitrate || 64000,
        userLimit: data.userLimit || 0
      });
    } else {
      restored = await guild.channels.create({
        name: data.name, type: 0,
        nsfw: data.nsfw,
        rateLimitPerUser: data.rateLimit || 0,
        topic: data.topic || undefined
      });
    }
  } catch (err) {
    bot.logger.error(`restoreChannelFromBackup hata: ${err.message}`);
    return null;
  }

  for (const ov of data.overwrites || []) {
    const r = guild.roles.cache.get(ov.id);
    const m = guild.members.cache.get(ov.id);
    const target = r ? { id: ov.id, type: 0 } : m ? { id: ov.id, type: 1 } : null;
    if (!target) continue;
    try {
      await restored.permissionOverwrites.edit(target.id, {
        allow: BigInt(ov.allow || '0'),
        deny: BigInt(ov.deny || '0')
      });
    } catch { /* yok */ }
  }

  await logSecurityEvent('backup_channel_restored', {
    guildId: guild.id, executorId: bot.client.user.id, targetId: restored.id,
    fromChannelId: channelId, name: data.name, kind: cdata ? 'category' : isVoice ? 'voice' : 'text'
  });
  return restored;
}

// Silme olayında DB yedeğinden otomatik restore (in-memory cache'e ek olarak)
async function autoRestoreChannel(bot, channelId) {
  const restored = await restoreChannelFromBackup(bot, channelId);
  if (restored) await logSecurityEvent('auto_restore_channel', { guildId: bot.guildId, executorId: bot.client.user.id, targetId: restored.id });
  return restored;
}

async function autoRestoreRole(bot, roleId) {
  const res = await restoreRoleFromBackup(bot, roleId);
  if (res) await logSecurityEvent('auto_restore_role', { guildId: bot.guildId, executorId: bot.client.user.id, targetId: res.role.id });
  return res ? res.role : null;
}

module.exports = {
  init,
  state: () => state,
  isInWhitelist,
  handleChannelDelete,
  handleChannelCreate,
  handleRoleCreate,
  handleRoleDelete,
  handleRoleUpdate,
  handleGuildBanAdd,
  handleGuildMemberRemove,
  handleGuildMemberAdd,
  handleMessageCreate,
  handleWebhookChange,
  handleBotAdd,
  activateLockdown,
  deactivateLockdown,
  requestSecurityApproval,
  approveSecurityAction,
  restoreChannel,
  restoreRole,
  loadCounters,
  flushCounters,
  takeBackup,
  listBackups,
  restoreRoleFromBackup,
  restoreChannelFromBackup,
  autoRestoreChannel,
  autoRestoreRole,
  punish,
  logSecurityEvent
};
