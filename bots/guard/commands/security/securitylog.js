'use strict';
const { GuildLog } = require('../../../../shared/models');
const { chunk } = require('../../../../shared/utils/helpers');

module.exports = {
  name: 'securitylog',
  aliases: ['glog', 'guvenliklog'],
  description: 'Guard / Security log olaylarini DB den listeler',
  usage: '.securitylog [adet|tur]',
  permission: ['bot-owner', 'guild-owner', 'admin'],
  cooldown: 10,
  async run({ bot, message, args }) {
    const limit = Math.min(parseInt(args[0], 10) || 10, 20);
    const docs = await GuildLog.find({ guildId: message.guild.id, bot: 'guard' }).sort({ createdAt: -1 }).limit(limit).lean();
    if (!docs.length) return message.reply(`${bot.emoji('info')} Log kaydi yok.`);
    return message.reply(chunk(docs.map((d) => `\`${d.createdAt.toISOString()}\` **${d.category}/${d.type}** exec:\`${d.userId || '-'}\` target:\`${d.targetId || '-'}\``).join('\n'), 1800).join('\n---\n'));
  }
};

