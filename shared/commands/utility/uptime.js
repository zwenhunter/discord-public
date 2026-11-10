'use strict';

module.exports = {
  name: 'uptime',
  description: 'Bot süresini gösterir',
  usage: '.uptime',
  permission: 'everyone',
  cooldown: 3,
  async run({ bot, message }) {
    const up = bot.client.uptime || 0;
    const d = Math.floor(up / 86400000), h = Math.floor(up / 3600000) % 24, m = Math.floor(up / 60000) % 60;
    return message.reply(`**${bot.name}** uptime: **${d}g ${h}sa ${m}dk** — Node ${process.version} — PID ${process.pid}`);
  }
};
