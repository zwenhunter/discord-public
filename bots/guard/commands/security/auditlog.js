'use strict';
const { AuditLogEvent } = require('discord.js');
const struct = require('../../../../shared/utils/helpers');

module.exports = {
  name: 'auditlog',
  aliases: ['audit'],
  description: 'Son audit log girislerini listeler (executor + olay)',
  usage: '.auditlog [adet]',
  permission: ['bot-owner', 'guild-owner', 'admin'],
  cooldown: 10,
  async run({ bot, message, args }) {
    const limit = Math.min(parseInt(args[0], 10) || 10, 25);
    if (!message.guild) return;
    const logs = await message.guild.fetchAuditLogs({ limit });
    const list = logs.entries.map((e) => `\`${e.id}\` **${AuditLogEvent[e.actionType]} / ${e.action}** exec: <@${e.executorId || '-'}> target: ${e.target?.id || e.reason || '-'}`);
    return message.reply(list.join('\n').slice(0, 1900) || 'bos');
  }
};

