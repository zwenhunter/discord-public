'use strict';
const { Remind } = require('../../models');
const { parseDuration, humanizeDuration } = require('../../utils/resolve');
const { ValidationError } = require('../../utils/helpers');

module.exports = {
  name: 'remind',
  aliases: ['hatirlat'],
  description: 'Belirtilen sure sonunda hatırlatma gönderir',
  usage: '.remind <sure|1h30m> <mesaj>',
  permission: 'everyone',
  cooldown: 5,
  async run({ bot, message, args }) {
    const ms = parseDuration(args[0] || '');
    if (!ms || ms > 7 * 86400000) throw new ValidationError('Sure gecersiz (min 1sn, max 7 gün).', '.remind <sure> <mesaj>');
    const text = args.slice(1).join(' ');
    if (!text) throw new ValidationError('Mesaj gir.', '.remind <sure> <mesaj>');
    await Remind.create({ guildId: message.guild.id, userId: message.author.id, channelId: message.channel.id, text, dueAt: new Date(Date.now() + ms) });
    return message.reply(`${bot.emoji('success')} ${humanizeDuration(ms)} sonra hatırlatacağim: ${text}`);
  }
};
