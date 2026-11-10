'use strict';

/**
 * .backup <al|liste|rol|kanal|temizle> [...]
 * - al [sebep]           : sunucu yedeği alır (roller + kanallar + izinler)
 * - liste                 : son yedekleri listeler
 * - rol <id|@rol>         : son yedekten rolü geri kurar (üye dağıtımı dahil)
 * - kanal <id|#kanal>     : son yedekten kanalı geri kurar (izinler dahil)
 * - temizle               : eski yedekleri siler (son 3 kalır)
 */
module.exports = {
  name: 'backup',
  aliases: ['yedek', 'yedekal'],
  description: 'Sunucu yedeği alır ve rol/kanal geri yükler',
  usage: '.backup <al|liste|rol|kanal|temizle> [hedef]',
  permission: ['guild-owner', 'bot-owner'],
  cooldown: 10,
  async run({ bot, message, args }) {
    const guards = require('../../../services/guard');
    const sub = (args[0] || '').toLowerCase();

    if (sub === 'al') {
      const reason = args.slice(1).join(' ') || 'manual';
      const m = await message.reply('Yedek alınıyor...');
      try {
        const backup = await guards.takeBackup(bot, reason);
        const roles = backup.roles.length;
        const channels = backup.textChannels.length + backup.voiceChannels.length + backup.categories.length;
        return m.edit(`✅ Yedek alındı (~${roles} rol, ${channels} kanal). ${backup._id}`);
      } catch (err) {
        return m.edit(`❌ Yedek alınamadı: ${err.message}`);
      }
    }

    if (sub === 'liste') {
      const list = await guards.listBackups(bot);
      if (!list.length) return message.reply('Yedek yok.');
      const lines = list.map((b) => `• ${b._id} — ${new Date(b.takenAt).toLocaleString('tr-TR')} — ${b.reason} (${b.roles.length} rol)`);
      return message.reply(['**Son yedekler:**', ...lines].join('\n'));
    }

    if (sub === 'rol') {
      const arg = args[1];
      if (!arg) return message.reply(bot.emoji('X') + ' Rol ID veya @rol gerekli.');
      const mention = message.mentions.roles.first();
      const id = (mention ? mention.id : arg).replace(/\D/g, '');
      if (!id) return message.reply(bot.emoji('X') + ' Geçersiz rol.');
      const m = await message.reply('Rol son yedekten geri kuruluyor...');
      const res = await guards.restoreRoleFromBackup(bot, id);
      if (!res) return m.edit(bot.emoji('X') + ' Son yedekte bu rol bulunamadı.');
      return m.edit(`✅ Rol geri kuruldu: ${res.role.name} — ${res.assigned} üyeye verildi.`);
    }

    if (sub === 'kanal') {
      const arg = args[1];
      if (!arg) return message.reply(bot.emoji('X') + ' Kanal ID veya #kanal gerekli.');
      const mention = message.mentions.channels.first();
      const id = (mention ? mention.id : arg).replace(/\D/g, '');
      if (!id) return message.reply(bot.emoji('X') + ' Geçersiz kanal.');
      const m = await message.reply('Kanal son yedekten geri kuruluyor...');
      const restored = await guards.restoreChannelFromBackup(bot, id);
      if (!restored) return m.edit(bot.emoji('X') + ' Son yedekte bu kanal bulunamadı.');
      return m.edit(`✅ Kanal geri kuruldu: ${restored.name}`);
    }

    if (sub === 'temizle') {
      const { GuildBackup } = require('../../../../shared/models');
      const docs = await GuildBackup.find({ guildId: bot.guildId }).sort({ takenAt: -1 });
      if (docs.length <= 3) return message.reply('Silinecek yedek yok.');
      const toRemove = docs.slice(3).map((d) => d._id);
      await GuildBackup.deleteMany({ _id: { $in: toRemove } });
      return message.reply(`🧹 ${toRemove.length} eski yedek silindi.`);
    }

    return message.reply(this.usage);
  }
};
