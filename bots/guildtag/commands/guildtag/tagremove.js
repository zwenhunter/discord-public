'use strict';
const { Tag } = require('../../../../shared/models');
const { ValidationError } = require('../../../../shared/utils/helpers');

module.exports = {
  name: 'tagremove',
  aliases: ['tagsil'],
  description: 'Tag siler',
  usage: '.tagremove <tag>',
  permission: ['bot-owner', 'guild-owner', 'admin'],
  cooldown: 10,
  async run({ bot, message, args }) {
    const tagText = args[0];
    if (!tagText) throw new ValidationError('.tagremove <tag>');
    const res = await Tag.deleteOne({ guildId: bot.guildId, tag: tagText });
    if (!res.deletedCount) return message.reply(`${bot.emoji('info')} Tag bulunamadi.`);
    return message.reply(`${bot.emoji('success')} Tag silindi: ${tagText}`);
  }
};

