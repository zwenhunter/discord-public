'use strict';

module.exports = {
  name: 'poll',
  description: 'Anket oluşturur (reaksiyonlarla)',
  usage: '.poll <soru>',
  permission: 'everyone',
  cooldown: 10,
  async run({ bot, message, args }) {
    const q = args.join(' ');
    if (!q) return message.reply(`${bot.emoji('error')} Soru gir.`);
    const r = await message.channel.send({ content: `${bot.emoji('info')} **ANKET:** ${q}` });
    // emoji filtresinden ucuz seçenek: unicode reaksiyonlar bileştirme
    await r.react('\u{1F44D}');
    await r.react('\u{1F44E}').catch(() => {});
  }
};
