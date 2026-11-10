'use strict';
const { pingDatabase, dbState } = require('../../database');
const { redact } = require('../../logger');

module.exports = {
  name: 'ping',
  description: 'Bot ping / istatistik kontrol',
  usage: '.ping',
  permission: 'everyone',
  cooldown: 3,
  async run({ bot, message }) {
    const ws = Math.max(0, Date.now() - message.createdTimestamp);
    const db = await pingDatabase().catch(() => ({ ok: false, state: 'none' }));
    return message.reply(`${bot.emoji('info')} WS ping: **${bot.client.ws.ping}ms**, round-trip: **${ws}ms**, DB: **${db.state}**, uptime: **${Math.floor(bot.client.uptime / 1000)}sn**, komut: **${bot.commands.commands.size}**`);
  }
};
