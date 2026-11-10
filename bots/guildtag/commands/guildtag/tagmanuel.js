'use strict';
const { Tag, TagUser } = require('../../../../shared/models');
const { ValidationError } = require('../../../../shared/utils/helpers');
const { resolveMember } = require('../../../../shared/utils/resolve');

module.exports = {
  name: 'tagmanuel',
  aliases: ['tagver'],
  description: 'Manuel tag ver/al (workflow protect)',
  usage: '.tagmanuel <ekle|cikar> <kullanici> [tag]',
  permission: ['bot-owner', 'guild-owner', 'admin'],
  cooldown: 5,
  async run({ bot, message, args, client }) {
    const action = args[0];
    if (!['ekle', 'cikar'].includes(action)) throw new ValidationError('.tagmanuel <ekle|cikar> <kullanici> [tag]');
    const member = await resolveMember(client, message.guild, args[1]);
    if (!member) return message.reply(`${bot.emoji('error')} Kullanici bulunamadi.`);
    const tags = await Tag.find({ guildId: bot.guildId }).lean();
    const tagText = action === 'ekle' ? args[2] || tags[0]?.tag : null;
    if (!tagText) return message.reply(`${bot.emoji('error')} Tag belirtilmeli veya tag tanımlı değil.`);
    const tagObj = tags.find((t) => t.tag === tagText);
    if (!tagObj) return message.reply(`${bot.emoji('error')} Tag bulamadım.`);

    if (action === 'ekle') {
      if (tagObj.roleId) await member.roles.add(tagObj.roleId, `tagmanuel ${message.author.tag}`).catch(() => {});
      await require('../../../../shared/models').TagUser.findOneAndUpdate(
        { guildId: bot.guildId, userId: member.id },
        { $set: { tag: tagText, joinedAt: new Date(), leftAt: null }, $push: { history: { tag: tagText, joinedAt: new Date(), action: 'force-join' } } },
        { upsert: true }
      );
      return message.reply(`${bot.emoji('success')} Tag verildi (manuel): ${member.user.tag} → ${tagText}`);
    }
    const doc = await TagUser.findOneAndUpdate(
      { guildId: bot.guildId, userId: member.id },
      { $set: { tag: '', leftAt: new Date() }, $push: { history: { tag: tagText, leftAt: new Date(), action: 'force-left' } } },
      { upsert: true }
    );
    if (tagObj.roleId) await member.roles.remove(tagObj.roleId, 'tagmanuel').catch(() => {});
    return message.reply(`${bot.emoji('success')} Tag alındı (manuel): ${member.user.tag}`);
  }
};

