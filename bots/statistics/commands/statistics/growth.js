'use strict';
const { GuildGrowth } = require('../../../../shared/models');

module.exports = {
  name: 'growth',
  aliases: ['buyume'],
  description: 'Sunucu üye artış/azalış istatistikleri',
  usage: '.growth [adet]',
  permission: 'everyone',
  cooldown: 10,
  async run({ bot, message, args }) {
    const N = Math.min(parseInt(args[0], 10) || 10, 30);
    const docs = await GuildGrowth.find({ guildId: bot.guildId }).sort({ date: -1 }).limit(N).lean();
    if (!docs.length) return message.reply(`${bot.emoji('info')} Veri yok.`);
    const lines = [];
    for (let i = 0; i < docs.length; i++) {
      const cur = docs[i];
      const prev = docs[i + 1];
      const diff = prev ? cur.memberCount - prev.memberCount : null;
      lines.push(`\`${cur.date}\` uyeler: **${cur.memberCount}** (insan ${cur.humans ?? '?'} / bot ${cur.bots ?? '?'} / online ${cur.online ?? '?'})${diff === 0 ? '' : diff ? ` — **${diff > 0 ? '+' : ''}${diff}**` : ''}`);
    }
    return message.reply('**Üye gelisirin:**\n' + lines.join('\n'));
  }
};

