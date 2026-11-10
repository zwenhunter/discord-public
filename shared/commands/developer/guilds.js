'use strict';

module.exports = {
  name: 'whitelist-control',
  description: 'Sunucuların ana ayarlarını listeler',
  usage: '.whitelist-control',
  permission: ['bot-owner', 'guild-owner'],
  cooldown: 10,
  async run({ bot, message }) {
    // sadece botun olduğu sunucular listesi
    return message.reply([...bot.client.guilds.cache.values()].map((g) => `${g.name} (${g.id}) — ${g.memberCount} uye`).join('\n') || 'bos');
  }
};
