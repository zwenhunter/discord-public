'use strict';
const { Tag } = require('../../../../shared/models');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'tag',
  aliases: ['tags'],
  description: 'Sunucudaki tagları listeler',
  usage: '.tag',
  permission: 'everyone',
  cooldown: 5,
  async run({ bot, message }) {
    const tags = await Tag.find({ guildId: bot.guildId, enabled: true }).lean();
    if (!tags.length) return message.reply(`${bot.emoji('info')} Tag tanımlanmamış. `.tagadd` kullan.`);
    return message.reply(`**Sunucu tagları:**\n` + tags.map((t) => `${t.name} — "${t.tag}" \u2192 <@&${t.roleId || '-'}>  (${t.stats?.joinedTotal || 0} kişi başladı)`).join('\n'));
  }
};

