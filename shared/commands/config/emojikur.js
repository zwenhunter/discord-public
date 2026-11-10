'use strict';
const fs = require('fs');
const path = require('path');
const { EmojiRegistry } = require('../../models');
const { EmojiManager } = require('../../emoji');

module.exports = {
  name: 'emojikur',
  description: 'emojiler/ klasörünü tarayıp sunucuya eksik emojileri yükler, DB’ye kaydeder',
  usage: '.emojikur [kategori]',
  permission: ['bot-owner', 'guild-owner'],
  cooldown: 60,
  async run({ bot, message, args }) {
    if (!bot.guildId) return message.reply(`${bot.emoji('error')} GUILD_ID ayarlı değil.`);
    const guild = bot.client.guilds.cache.get(bot.guildId);
    if (!guild) return message.reply(`${bot.emoji('error')} Guild bulunamadi.`);
    if (!guild.members.me.permissions.has('ManageGuildExpressions')) {
      return message.reply(`${bot.emoji('error')} Sunucuda "Manage Expressions" izinim yok.`);
    }
    const emojiDir = path.resolve(process.cwd(), bot.global.emoji?.dir || 'emojiler');
    if (!fs.existsSync(emojiDir)) return message.reply(`${bot.emoji('error')} emojiler/ klasörü bulunamadı: ${emojiDir}`);

    const categoryFilter = args[0];
    const files = bot.emojiManager.loadFromDisk(emojiDir);
    if (!files) return message.reply(`${bot.emoji('error')} Emoji dosyasi yok.`);
    const allFiles = bot.emojiManager.allFiles().filter((f) => categoryFilter ? f.category === categoryFilter : true);

    const REGISTERED = await EmojiRegistry.find({ guildId: bot.guildId }).lean();
    const existingKeys = new Set(REGISTERED.map((r) => r.key));
    const existingEmojiNames = new Set(guild.emojis.cache.map((e) => e.name));

    const budget = guild.maximumEmojis ? guild.maximumEmojis - guild.emojis.cache.size : Math.max(0, 100 - guild.emojis.cache.size);
    let uploaded = 0, skipped = 0, failed = 0;
    const failedList = [];
    const reply = await message.channel.send(`${bot.emoji('loading')} ${allFiles.length} dosya tarandı, ${budget} slot var. Yüklemeye basla`);
    for (const f of allFiles) {
      if (uploaded >= budget) {
        await reply.edit(`${bot.emoji('warning')} Emoji limitine ulaştım: ${uploaded} yüklendi, ${allFiles.length - skipped - uploaded} atlandı.`).catch(() => {});
        break;
      }
      if (existingKeys.has(f.key)) { skipped++; continue; }
      if (existingEmojiNames.has(f.key)) { skipped++; continue; }
      try {
        const buf = fs.readFileSync(f.file);
        const emoji = await guild.emojis.create({ attachment: buf, name: f.key });
        await EmojiRegistry.create({ guildId: bot.guildId, key: f.key, name: emoji.name, emojiId: emoji.id, animated: emoji.animated, format: f.format });
        uploaded++;
      } catch (err) {
        failed++;
        failedList.push(`${f.key}: ${err.message}`.slice(0, 100));
      }
    }
    // cache update
    await bot.loadDBGuildEmojis();
    const summary = [
      `${bot.emoji('success')} **Emoji kurulumu tamam**`,
      `Toplam dosya: ${allFiles.length}`,
      `Yüklendi: ${uploaded}, Skip: ${skipped}, Fail: ${failed}`,
      failedList.length ? `\n**Hatalar:**\n${failedList.slice(0, 5).join('\n')}` : ''
    ].filter(Boolean).join('\n');
    await reply.edit(summary).catch(() => {});
  }
};
