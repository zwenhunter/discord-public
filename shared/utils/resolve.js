'use strict';

/**
 * Matcher: kullanici, ID, mention veya username lookup.
 * @param {string} rawType 'user'|'member'|'role'
 */
async function resolveUser(input, clientArg) {
  if (!input) return null;
  const mention = input.match(/^<@!?(\d+)>$/);
  const id = input.match(/^(\d{17,20})$/);
  const idToUse = mention ? mention[1] : id ? id[1] : null;
  if (idToUse) {
    try {
      return await clientArg.users.fetch(idToUse);
    } catch { return null; }
  }
  // username ile searchable
  const name = input.toLowerCase();
  try {
    if (clientArg.guilds.cache.size > 0) {
      for (const guild of clientArg.guilds.cache.values()) {
        const members = await guild.members.fetch();
        const found = members.find((m) => m.user.username.toLowerCase() === name || (m.nickname || '').toLowerCase() === name);
        if (found) return found.user;
      }
    }
  } catch { /* not found */ }
  return null;
}

async function resolveMember(clientArg, guild, input) {
  if (!input || !guild) return null;
  const mention = input.match(/^<@!?(\d+)>$/);
  const id = input.match(/^(\d{17,20})$/);
  const idToUse = mention ? mention[1] : id ? id[1] : null;
  if (idToUse) {
    try {
      return await guild.members.fetch({ user: idToUse });
    } catch {
      return null;
    }
  }
  const name = input.toLowerCase();
  try {
    const members = await guild.members.fetch();
    const res = members.find((m) => m.user.username.toLowerCase() === name || (m.nickname || '').toLowerCase() === name);
    return res || null;
  } catch {
    return null;
  }
}

function resolveRole(guild, input) {
  if (!input || !guild) return null;
  const mention = input.match(/^<@&(\d+)>$/);
  const id = input.match(/^(\d{17,20})$/);
  const idToUse = mention ? mention[1] : id ? id[1] : null;
  if (idToUse) return guild.roles.cache.get(idToUse) || null;
  const name = input.toLowerCase();
  return guild.roles.cache.find((r) => r.name.toLowerCase() === name) || null;
}

function resolveChannel(guild, input) {
  if (!input || !guild) return null;
  const mention = input.match(/^<#(\d+)>$/);
  const id = input.match(/^(\d{17,20})$/);
  const idToUse = mention ? mention[1] : id ? id[1] : null;
  if (idToUse) return guild.channels.cache.get(idToUse) || null;
  const name = input.toLowerCase();
  return guild.channels.cache.find((c) => c.name.toLowerCase() === name) || null;
}

function parseDuration(str) {
  if (!str) return null;
  const m = String(str).match(/^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i) || ( /^\d+$/.test(str) ? [str, str, null, null, null, null] : null);
  if (!m) return null;
  const d = parseInt(m[1] || '0', 10);
  const h = parseInt(m[2] || '0', 10);
  const mi = parseInt(m[3] || '0', 10);
  const s = parseInt(m[4] || '0', 10);
  const total = ((d * 24 + h) * 60 + mi) * 60 + s;
  return total > 0 ? total * 1000 : null;
}

function humanizeDuration(ms) {
  if (!ms || ms < 0) return '0sn';
  const d = Math.floor(ms / 86400000), h = Math.floor(ms % 86400000 / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000);
  return [d && d + 'g', h && h + 'sa', m && m + 'dk', s && s + 'sn'].filter(Boolean).join(' ') || '0sn';
}

function formatTimestamp(dateOrMs, style = 'R') {
  const d = dateOrMs instanceof Date ? dateOrMs : new Date(dateOrMs);
  return `<t:${Math.floor(d.getTime() / 1000)}:${style}>`;
}

module.exports = { resolveUser, resolveMember, resolveRole, resolveChannel, parseDuration, humanizeDuration, formatTimestamp };
