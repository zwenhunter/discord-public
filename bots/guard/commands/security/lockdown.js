'use strict';
const guards = require('../../services/guard');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'lockdown',
  aliases: ['kilit'],
  description: 'Acil durum kilidi: tum yazi kanallarini kilitler (anti-raid)',
  usage: '.lockdown [aciklama|kapat] [saniye]',
  permission: ['bot-owner', 'guild-owner', 'admin'],
  cooldown: 10,
  async run({ bot, message, args }) {
    const action = args[0] || 'kapat';
    if (/^(kapat|unlock|off)$/i.test(action)) {
      await guards.deactivateLockdown(bot, `manuel - ${message.author.id}`);
      return message.reply(`${bot.emoji('success')} Kilid acildi.`);
    }
    const reason = args.slice(1).join(' ') || 'guvenlik kilidi';
    await guards.activateLockdown(bot, `${reason} (${message.author.tag})`);
    return message.reply(`${bot.emoji('success')} Lockdown aktif. Sure: ${bot.config.antiRaid.lockdownDurationMs / 1000} sn. Ac Mak icin .lockdown kapat`);
  }
};
