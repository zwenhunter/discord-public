'use strict';

module.exports = {
  name: 'botstatus',
  description: 'Bot sistem detayları (ram / uptime / db / cache / komutlar)',
  usage: '.botstatus',
  aliases: ['durum'],
  permission: ['bot-owner', 'guild-owner', 'admin'],
  cooldown: 10,
  async run({ bot, message }) {
    const used = process.memoryUsage();
    const mb = (b) => Math.round(b / 1024 / 1024);
    return message.reply([
      `**${bot.name}** uptime: ${Math.floor(process.uptime() / 60)}dk`,
      `RSS: ${mb(used.rss)}MB, Heap: ${mb(used.heapUsed)}/${mb(used.heapTotal)}MB`,
      `WS ping: ${bot.client.ws.ping}ms, Guilds: ${bot.client.guilds.cache.size}`,
      `Komutlar: ${bot.commands.commands.size}, Aliases: ${bot.commands.aliases.size}, Events: ${bot.events.events.size}`,
      `Node: ${process.version}`
    ].join('\n'));
  }
};
