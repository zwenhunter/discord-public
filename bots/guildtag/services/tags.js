'use strict';
const { Tag, TagUser } = require('../../../shared/models');

/**
 * Guild Tag Bot:
 * - user'ın displayName / username'inde tag var mi kontrol eder
 * - tag alisa: role ver + log + notify
 * - tag biraktı: role al + log
 */
async function getGuildTags(bot) {
  return Tag.find({ guildId: bot.guildId, enabled: true }).lean();
}

function hasTag(user, tag) {
  if (!user || !tag) return false;
  return (user.username || '').includes(tag) || (user.globalName || '').includes(tag);
}

async function bindUser(bot, userId, tag) {
  const date = new Date();
  const doc = await TagUser.findOne({ guildId: bot.guildId, userId });
  if (!doc) {
    await TagUser.create({ guildId: bot.guildId, userId, tag, joinedAt: date, history: [{ tag, joinedAt: date, action: 'join' }] });
  } else if (doc.tag !== tag) {
    doc.tag = tag;
    doc.joinedAt = date;
    doc.leftAt = null;
    if (doc.history.some((h) => h.tag !== tag || h.leftAt)) {
      doc.history.push({ tag, joinedAt: date, action: 'join' });
    }
    await doc.save();
  }
  if (doc && doc.tag === tag) { /* up-to-date */ }
  return doc;
}

async function unbindTag(bot, userId, action = 'left') {
  const doc = await TagUser.findOne({ guildId: bot.guildId, userId });
  if (!doc || !doc.tag) return null;
  const oldTag = doc.tag;
  doc.leftAt = new Date();
  doc.tag = '';
  doc.history.push({ tag: oldTag, leftAt: doc.leftAt, action });
  await doc.save();
  await Tag.updateOne({ guildId: bot.guildId, tag: oldTag }, { $inc: { 'stats.leftTotal': 1 } });
  return { oldTag, doc };
}

async function checkUser(bot, member) {
  const tags = await getGuildTags(bot);
  if (!member) return null;
  const doc = await TagUser.findOne({ guildId: bot.guildId, userId: member.id });
  let userTag = null;
  for (const t of tags) {
    if (hasTag(member.user, t.tag)) { userTag = t; break; }
  }
  if (userTag) {
    const hadOld = doc?.tag;
    if (hadOld !== userTag.tag) {
      // role solasında
      if (hadOld) {
        const oldRole = tags.find((t) => t.tag === hadOld)?.roleId;
        if (oldRole && member.roles.cache.has(oldRole)) await member.roles.remove(oldRole, 'tag degiştim');
      }
      await bindUser(bot, member.id, userTag.tag);
      if (userTag.roleId && !member.roles.cache.has(userTag.tag ? userTag.roleId : '')) {
        await member.roles.add(userTag.roleId, `Tag desktop ${userTag.tag}`).catch(() => {});
      }
      if (userTag.registeredRoleId && member.roles.cache.has(userTag.registeredRoleId)) {
        await member.roles.add(userTag.roleId).catch(() => {});
      }
      await Tag.updateOne({ guildId: bot.guildId, tag: userTag.tag }, { $inc: { 'stats.joinedTotal': 1 } });
      await bot.log.log('GUILDTAG', 'tag_join', { userId: member.id, tag: userTag.tag });
      await notify(bot, userTag, `${member.user.tag} \`${userTag.tag}\` tagını aldı.`);
      return { action: 'join', tag: userTag.tag };
    }
    return { action: 'noop', tag: userTag.tag };
  } else if (doc?.tag) {
    const old = tags.find((t) => t.tag === doc.tag);
    if (old?.roleId && member.roles.cache.has(old.roleId)) {
      await member.roles.remove(old.roleId, 'Tag bıraktı');
    }
    await unbindTag(bot, member.id, 'disc');
    await bot.log.log('GUILDTAG', 'tag_left', { userId: member.id, tag: doc.tag });
    await notify(bot, old, `${member.user.tag} \`${doc.tag}\` tagını bıraktı.`);
    return { action: 'left', tag: doc.tag };
  }
  return null;
}

async function notify(bot, tagObj, message) {
  const channelId = tagObj?.notifyChannel || bot.config.notifyChannel || '';
  if (!channelId) return;
  const channel = bot.client.channels.cache.get(channelId);
  if (channel) await channel.send(message).catch(() => {});
}

async function checkAll(bot) {
  const guild = bot.client.guilds.cache.get(bot.guildId);
  if (!guild) return;
  const members = await guild.members.fetch();
  const results = [];
  for (const m of members.values()) {
    if (m.user.bot) continue;
    try {
      const r = await checkUser(bot, m);
      if (r && (r.action === 'join' || r.action === 'left')) results.push(r);
    } catch { /* ignore */ }
  }
  if (results.length) bot.logger.info(`Tag scan: ${results.length} değişiklik`);
  return results;
}

async function syncExisting(bot) {
  // ilk yuzde: DB'de tag user olabilir ama sunucu rolesi karşıdan yok, ama tag'larimdi checkAll karşımanın yapmıyor
  await checkAll(bot);
}

module.exports = { getGuildTags, checkUser, checkAll, bindUser, unbindTag, hasTag, notify };
