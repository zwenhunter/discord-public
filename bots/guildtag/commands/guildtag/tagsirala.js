'use strict';
const { Tag, TagUser } = require('../../../../shared/models');
const { validate: v } = require('../../../../shared/utils/helpers');

module.exports = {
  name: 'tagsirala',
  aliases: ['tagsiralama'],
  description: 'En çok tag alan kullanıcıları listeler',
  usage: '.tagsirala [adet]',
  permission: 'everyone',
  cooldown: 10,
  async run({ bot, message, args }) {
    const limit = Math.min(parseInt(args[0], 10) || 10, 25);
    const top = await TagUser.find({ guildId: bot.guildId, tag: { $ne: '' } }).sort({ joinedAt: -1 }).limit(limit).lean();
    if (!top.length) return message.reply(`${bot.emoji('info')} Tag alan kullanıcı yok.`);
    return message.reply(`**Taglı kullanıcılar (${top.length}):**\n` + top.map((d, i) => `${i + 1}. <@${d.userId}> — ${d.tag} — <t:${Math.floor(new Date(d.joinedAt).getTime() / 1000)}:R>`).join('\n'));
  }
};

