'use strict';
const { Tag, TagUser } = require('../../../../shared/models');
const { resolveMember } = require('../../../../shared/utils/resolve');

module.exports = {
  name: 'taginfo',
  aliases: ['tagim'],
  description: 'Bir kullanıcının tag durumunu gösterir',
  usage: '.taginfo [@kullanici]',
  permission: 'everyone',
  cooldown: 5,
  async run({ bot, message, args, client }) {
    const member = args[0] ? await resolveMember(client, message.guild, args[0]) : message.member;
    if (!member) return message.reply(`${bot.emoji('error')} Kullanici bulunamadi.`);
    const doc = await TagUser.findOne({ guildId: bot.guildId, userId: member.id }).lean();
    if (!doc || !doc.tag) {
      // tag sunucunun taglarına uyuyor mu?
      const tags = await Tag.find({ guildId: bot.guildId }).lean();
      const match = tags.find((t) => (member.user.username || '').includes(t.tag) || (member.user.globalName || '').includes(t.tag));
      if (match) return message.reply(`${bot.emoji('warning')} **${member.user.tag}** \`${match.tag}\` tagına uyuyor ama DB kaydıizmneli. \`.\taggedinel\` kullan ya da .tag 操作.`);
      return message.reply(`${bot.emoji('info')} **${member.user.tag}** tag almamış.`);
    }
    return message.reply([
      `**${member.user.tag}**`,
      `Tag: **${doc.tag}**`,
      `Aldi: <t:${Math.floor(new Date(doc.joinedAt).getTime() / 1000)}:R>`,
      `Tag bırakma: ${doc.leftAt ? `<t:${Math.floor(new Date(doc.leftAt).getTime() / 1000)}:R>` : '-'}`
    ].join('\n'));
  }
};

