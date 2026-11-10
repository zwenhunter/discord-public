'use strict';

module.exports = {
  name: 'whitelist',
  aliases: ['wl'],
  description: 'Guard whitelist yonetimi (ekle/cikar/listele)',
  usage: '.whitelist <ekle|cikar|liste> [userID]',
  permission: ['bot-owner', 'guild-owner'],
  cooldown: 5,
  async run({ bot, message, args }) {
    const action = (args[0] || 'liste').toLowerCase();
    const wl = bot.config.whitelist;
    if (action === 'liste' || action === 'list') {
      return message.reply(`${bot.emoji('info')} Whitelist (${wl.length}): ${wl.join(', ') || 'bos'}`);
    }
    const id = args[1]?.replace(/[^0-9]/g, '');
    if (!id) return message.reply(`${bot.emoji('error')} Kullanici ID gir.`);
    if (action === 'ekle' || action === 'add') {
      if (!wl.includes(id)) wl.push(id);
      return message.reply(`${bot.emoji('success')} ${id} whitelist'e eklendi.`);
    }
    if (action === 'cikar' || action === 'remove') {
      const i = wl.indexOf(id);
      if (i > -1) wl.splice(i, 1);
      return message.reply(`${bot.emoji('success')} ${id} whitelist'ten cikarildi.`);
    }
    return message.reply(`${bot.emoji('error')} Gecersiz islem.`);
  }
};
