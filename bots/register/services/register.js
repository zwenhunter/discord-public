'use strict';
const { Register: RegModel, MemberStat, GuildSettings } = require('../../../shared/models');
const { resolveMember } = require('../../../shared/utils/resolve');

/**
 * Register service
 * config/register.js roles.{unregistered,male,female,other,registered,staff} channel.register
 */
async function checkStaff(member, bot) {
  if (!member) return false;
  const staffRole = bot.config.roles.staff;
  if (staffRole && member.roles.cache.has(staffRole)) return true;
  return member.permissions.has('ManageNickname');
}

function nameAge(raw) {
  // pattern: name age
  const parts = raw.trim().replace(/\s+/g, ' ').split(' ');
  const age = parts.length >= 2 ? parseInt(parts[parts.length - 1], 10) : null;
  const name = age != null ? parts.slice(0, -1).join(' ') : raw.trim();
  return { name, age };
}

async function genderRoles(bot, gender) {
  const r = bot.config.roles;
  if (gender === 'male') return [r.male, r.registered].filter(Boolean);
  if (gender === 'female') return [r.female, r.registered].filter(Boolean);
  return [r.other, r.registered].filter(Boolean);
}

async function doRegister(bot, guild, staffId, rawTarget, gender, rawName, reason) {
  const member = await resolveMember(bot.client, guild, rawTarget);
  if (!member) throw new Error('Üye bulunamadı.');
  const { name, age } = nameAge(rawName);
  if (!name) throw new Error('İsim belirtilmeli.');
  if (age != null) {
    if (age < bot.config.names?.minAge || age > bot.config.names?.maxAge) throw new Error('Yaş aralık dışı.');
  } else if (bot.config.names?.ageRequired) {
    throw new Error('Yaş belirtilmeli: `isim yaş`');
  }
  const unreg = bot.config.roles.unregistered;
  const staffMem = await resolveMember(bot.client, guild, staffId);
  const toAdd = await genderRoles(bot, gender);
  const roles = toAdd.filter((id) => id && guild.roles.cache.has(id));
  if (!roles.length) throw new Error('Konfigurasyon rolleri eksik: config/register.js rolarını kontrol et.');

  await member.roles.add(roles, `Kayit: ${gender} | by ${staffMem?.user.tag}`);
  if (unreg && member.roles.cache.has(unreg)) {
    await member.roles.remove(unreg, `Kayit (unregistered remove)`);
  }
  await member.setNickname(`${name}${age != null ? ` | ${age}` : ''}`, `Kayit by ${staffMem?.user.tag}`).catch(() => {});

  const doc = await RegModel.create({
    guildId: bot.guildId, userId: member.id, staffId, name, age, gender,
    rolesGiven: roles, rolesRemoved: unreg ? [unreg] : []
  });
  // member stat: registered count
  await MemberStat.updateOne({ guildId: bot.guildId, userId: staffId }, { $inc: { registeredCount: 1 } }, { upsert: true });
  await bot.log.log('REGISTER', `register_${gender}`, { userId: member.id, staffId, name, age });
  await welcome(bot, member, name, age, gender);
  return { doc, member };
}

async function welcome(bot, member, name, age, gender) {
  const cfg = bot.config.welcome || {};
  if (cfg.enabled) {
    const msg = (cfg.message || 'Hoş geldin {user}!').replace('{user}', `<@${member.id}>`).replace('{name}', name).replace('{age}', String(age ?? '')).replace('{gender}', gender);
    await member.send(msg).catch(() => {});
    const chId = bot.config.channels?.register;
    if (chId) {
      const ch = bot.client.channels.cache.get(chId);
      if (ch) await ch.send(`${msg} — **${name}${age ? ' | ' + age : ''}** kaydı yapıldı.`).catch(() => {});
    }
  }
}

async function cancelRegister(bot, guild, rawTarget) {
  const member = await resolveMember(bot.client, guild, rawTarget);
  if (!member) throw new Error('Üye bulunamadı.');
  const last = await RegModel.findOne({ guildId: bot.guildId, userId: member.id, cancelled: false }).sort({ createdAt: -1 });
  if (!last) throw new Error('Kayıt geçmişi yok.');
  last.cancelled = true;
  await last.save();
  // rolleri geri al
  if (last.rolesGiven && last.rolesGiven.length) await member.roles.remove(last.rolesGiven, `kayıt iptal by ${last.staffId}`);
  if (bot.config.roles.unregistered) await member.roles.add(bot.config.roles.unregistered, 'kayıt iptal');
  await bot.log.log('REGISTER', 'register_cancel', { userId: member.id, staffId: last.staffId });
  return last;
}

module.exports = { doRegister, cancelRegister, checkStaff, nameAge, genderRoles };
