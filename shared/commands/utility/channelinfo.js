'use strict';
const { resolveChannel } = require('../../utils/resolve');

module.exports = {
  name: 'channelinfo',
  aliases: ['kanalinfo'],
  description: 'Kanal bilgisi',
  usage: '.channelinfo [#kanal]',
  permission: 'everyone',
  cooldown: 3,
  async run({ bot, message, args }) {
    const ch = args[0] ? resolveChannel(message.guild, args[0]) : message.channel;
    if (!ch) return message.reply(`${bot.emoji('error')} Kanal bulunamadi.`);
    const lines = [
      `**Kanal:** ${ch.name} (${ch.id})`,
      `Tip: ${ch.type}, kategori: ${ch.parentId ? '<#' + ch.parentId + '>' : '-'}`,
      `Olusturulma: <t:${Math.floor(ch.createdTimestamp / 1000)}:R>`
    ];
    if (ch.type === 0 || ch.type === 2) lines.push(`slowmode: ${ch.rateLimitPerUser}`);
    if (ch.members && ch.userLimit !== undefined) lines.push(`limit: ${ch.userLimit}`);
    return message.reply(lines.join('\n'));
  }
};
