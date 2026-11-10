'use strict';

module.exports = {
  name: 'servericon',
  aliases: ['sunucuicon'],
  description: 'Sunucu ikonunu gösterir',
  usage: '.servericon',
  permission: 'everyone',
  cooldown: 3,
  async run({ bot, message }) {
    if (!message.guild.iconURL()) return message.reply(`${bot.emoji('info')} Sunucu ikonu yok.`);
    return message.reply(message.guild.iconURL({ size: 1024 }));
  }
};
