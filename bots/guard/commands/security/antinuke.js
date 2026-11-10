'use strict';

module.exports = {
  name: 'antinuke',
  aliases: ['anuke'],
  description: 'Anti-nuke limit ayarlari (listele / limit degistir / punish)',
  usage: '.antinuke <liste|limit|punish> [olay] [deger]',
  permission: ['bot-owner', 'guild-owner'],
  cooldown: 5,
  async run({ bot, message, args }) {
    const action = (args[0] || 'liste').toLowerCase();
    const cfg = bot.config.antiNuke;
    const keys = ['channelDelete', 'channelCreate', 'channelUpdate', 'roleDelete', 'roleCreate', 'roleUpdate', 'ban', 'kick', 'webhookCreate', 'webhookUpdate', 'botAdd', 'guildUpdate', 'emojiDelete', 'integrationUpdate'];
    if (action === 'liste') {
      return message.reply(keys.map((k) => `${k}: limit=${cfg[k].limit} interval=${cfg[k].interval / 1000}sn punish=${cfg[k].punish}`).join('\n') + `\nPunishment: ${cfg.punishment}`);
    }
    const sub = args[1];
    const val = args[2];
    if (action === 'punish') {
      if (!['ban', 'timeout', 'kick'].includes(val)) return message.reply(`${bot.emoji('error')} Geçerli punishment: ban | timeout | kick`);
      cfg.punishment = val;
      return message.reply(`${bot.emoji('success')} Punishment: ${val}`);
    }
    if (action === 'limit') {
      const ev = keys.find((k) => k.toLowerCase() === (sub || '').toLowerCase());
      if (!ev) return message.reply(`${bot.emoji('error')} Geçersiz olay. Olaylari: ${keys.join(', ')}`);
      cfg[ev].limit = parseInt(val, 10) || cfg[ev].limit;
      return message.reply(`${bot.emoji('success')} ${ev}.limit = ${cfg[ev].limit}`);
    }
    return message.reply(`${bot.emoji('error')} Kullanim: .antinuke <liste|limit|punish> [olay] [deger]`);
  }
};
