'use strict';
const { PermissionFlagsBits } = require('discord.js');
const mod = require('../../services/moderation');
const { ValidationError } = require('../../../../shared/utils/helpers');

module.exports = {
  name: 'clear',
  aliases: ['sil', 'purge'],
  description: 'Belirtilen kadar mesaj siler',
  usage: '.clear <miktar> [kullanici]',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin'],
  cooldown: 5,
  async run({ bot, message, args }) {
    const amount = parseInt(args[0], 10);
    if (!amount || amount < 1 || amount > (bot.global.limits?.maxPurgeAmount ?? 500)) throw new ValidationError('Miktar 1-500 arası olmalı.');
    if (!message.channel.permissionsFor(message.guild.members.me).has(PermissionFlagsBits.ManageMessages)) throw new ValidationError('Mesaj yönet yetkim yok.');
    const userFilter = args[1] ? args[1].replace(/[^0-9]/g, '') : null;
    let count = 0;
    let remaining = amount;
    for (let i = 0; i < 50 && remaining > 0; i++) {
      // 2 haftadan eski mesaj silınamaz, discord.js otomatik filtreler
      const msgs = await message.channel.messages.fetch({ limit: Math.min(remaining + 1, 100) });
      const array = [...msgs.values()].filter((m) => userFilter ? m.author.id === userFilter : true).slice(0, remaining);
      if (!array.length) break;
      // "clear" sonlanması için biraz önce yapılana rağmen silmek
      const del = await message.channel.bulkDelete(array, true).catch(() => null);
      if (!del) break;
      count += del.size;
      remaining -= del.size;
    }
    await mod.createCase(bot, { guild: message.guild, targetUserId: userFilter || 'channel', targetTag: '', moderatorId: message.author.id, type: 'purge', reason: `${count} mesaj @ ${message.channel.name}`, active: false });
    const reply = await message.channel.send(`${bot.emoji('success')} ${count} mesaj silindi (by ${message.author.tag}).`);
    setTimeout(() => reply.delete().catch(() => {}), 5000);
  }
};

