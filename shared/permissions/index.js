'use strict';
const { PermissionFlagsBits } = require('discord.js');

/**
 * Merkezi izin sistemi (tum botlar icin ortak)
 *
 * Permission format:
 * - string: 'bot-owner' | 'guild-owner' | 'admin' | 'staff' | 'mod' | 'everyone'
 * - bigint: Discord permission
 * - array: bir tanesi yeterli
 */
const LEVELS = { everyone: 0, staff: 10, mod: 20, admin: 30, 'guild-owner': 40, 'bot-owner': 50 };

async function checkPermission(ctx) {
  const { client, guild, member } = ctx;
  const perm = ctx.command.permission ?? 'staff';

  // 1) Bot owner her zaman geçer
  const owners = client.ecosystem?.global?.ownerIds || [];
  if (member && owners.includes(member.id)) return { ok: true, level: 'bot-owner' };

  const opts = Array.isArray(perm) ? perm : [perm];
  const levels = opts.map((p) => (typeof p === 'bigint' ? 'discord' : p));

  for (const lvl of levels) {
    if (lvl === 'everyone') return { ok: true, level: 'everyone' };
    if (lvl === 'bot-owner') continue;
    if (!member) continue;

    if (lvl === 'guild-owner' && guild.ownerId === member.id) return { ok: true, level: 'guild-owner' };
    if (lvl === 'admin' && member.permissions.has(PermissionFlagsBits.Administrator)) return { ok: true, level: 'admin' };
    if (lvl === 'admin' && member.permissions.has(PermissionFlagsBits.ManageGuild)) return { ok: true, level: 'admin' };
    if (lvl === 'mod' && (member.permissions.has(PermissionFlagsBits.ManageMessages) || member.permissions.has(PermissionFlagsBits.ManageChannels) || member.permissions.has(PermissionFlagsBits.ModerateMembers))) return { ok: true, level: 'mod' };
    if (lvl === 'staff') {
      const cfg = client.ecosystem?.config;
      const staffRoles = (cfg && cfg.staffRoles) ? cfg.staffRoles : client.ecosystem?.staffRoles || [];
      if (staffRoles.some((r) => member.roles.cache.has(r)) || member.permissions.has(PermissionFlagsBits.ManageMessages)) return { ok: true, level: 'staff' };
    }
    if (typeof perm === 'bigint' && perm !== undefined) {
      if (member.permissions.has(perm)) return { ok: true, level: 'discord' };
    }
  }

  return { ok: false, level: null };
}

function levelOf(perm) {
  if (typeof perm === 'bigint') return 'discord';
  return LEVELS[perm] !== undefined ? perm : 'staff';
}

module.exports = { checkPermission, levelOf };
