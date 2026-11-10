'use strict';

module.exports = {
  name: 'serverinfo',
  aliases: ['sunucuinfo'],
  description: 'Sunucu bilgisi',
  usage: '.serverinfo',
  permission: 'everyone',
  cooldown: 5,
  async run({ bot, message }) {
    const g = message.guild;
    const emojis = g.emojis.cache.size;
    const channels = g.channels.cache;
    const humans = g.members.cache.filter((m) => !m.user.bot).size;
    const bots = g.members.cache.filter((m) => m.user.bot).size;
    // full member list only when fetched
    return message.reply([
      `**Sunucu:** ${g.name} (${g.id})`,
      `**Owner:** <@${g.ownerId}>`,
      `**Uye:** cache'de ${g.memberCount} (insan ${humans} + bot ${bots})`,
      `**Kanal:** ${channels.size} (text ${channels.filter((c) => c.type === 0).size}, voice ${channels.filter((c) => c.type === 2).size}, kategori ${channels.filter((c) => c.type === 4).size})`,
      `**Rol:** ${g.roles.cache.size}`,
      `**Emoji:** ${emojis}/${g.maximumTotalEmojis || 50}`,
      `**Boost:** ${g.premiumSubscriptionCount || 0} (level ${g.premiumTier})`,
      `**Olusturulma:** <t:${Math.floor(g.createdTimestamp / 1000)}:R>`
    ].join('\n'));
  }
};
