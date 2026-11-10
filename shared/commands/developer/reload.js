'use strict';

module.exports = {
  name: 'reload',
  description: 'Komut/event cache yenile (hot-reload)',
  usage: '.reload [komutadi|all]',
  permission: ['bot-owner'],
  cooldown: 10,
  async run({ bot, message, args }) {
    if (args[0] && args[0] !== 'all') {
      const ok = bot.commands.reload(args[0]);
      return message.reply(ok ? `${bot.emoji('success')} ${args[0]} reload edildi.` : `${bot.emoji('error')} Komut bulunamadi.`);
    }
    bot.commands.reload();
    bot.events.load();
    return message.reply(`${bot.emoji('success')} ${bot.commands.commands.size} komut, ${bot.commands.aliases.size} alias reload.`);
  }
};
