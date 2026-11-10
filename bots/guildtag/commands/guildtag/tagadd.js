'use strict';
const { Tag } = require('../../../../shared/models');
const { ValidationError } = require('../../../../shared/utils/helpers');
const { resolveRole } = require('../../../../shared/utils/resolve');

module.exports = {
  name: 'tagadd',
  aliases: ['tag-ekle'],
  description: 'Yeni tag ekler (yetkili)',
  usage: '.tagadd <tag> <isim> [rol] [notify-kanal]',
  permission: ['bot-owner', 'guild-owner', 'admin'],
  cooldown: 10,
  async run({ bot, message, args }) {
    if (args.length < 2) throw new ValidationError('.tagadd <tag> <isim> [rol] [notify-kanal]');
    const tagText = args[0];
    const name = args[1];
    const role = args[2] ? resolveRole(message.guild, args[2]) : null;
    const notifyChannel = args[3]?.replace(/[^0-9]/g, '') || '';
    const exists = await Tag.findOne({ guildId: bot.guildId, tag: tagText });
    if (exists) return message.reply(`${bot.emoji('info')} Bu tag zaten tanımlı.`);
    await Tag.create({
      guildId: bot.guildId, tag: tagText, name,
      roleId: role?.id || '', notifyChannel, taglogChannel: bot.config.taglogChannel,
      enabled: true
    });
    return message.reply(`${bot.emoji('success')} Tag eklendi: **${name}** \u2192 "${tagText}" ${role ? `<@&${role.id}>` : ''}`);
  }
};

