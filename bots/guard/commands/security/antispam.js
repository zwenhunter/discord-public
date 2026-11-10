'use strict';

module.exports = {
  name: 'antispam',
  aliases: ['aspam'],
  description: 'Anti-spam ayarlari',
  usage: '.antispam <liste|flood|mention|punish|emoji> [limit|punish]',
  permission: ['bot-owner', 'guild-owner'],
  cooldown: 5,
  async run({ bot, message, args }) {
    const action = (args[0] || 'liste').toLowerCase();
    const cfg = bot.config.antiSpam;
    const v = args[1];
    if (action === 'liste') {
      return message.reply(`flood: ${cfg.messageFlood.limit}/${cfg.messageFlood.interval / 1000}sn\nmention: ${cfg.mentionSpam.limit}\nemoji: ${cfg.emojiSpam.limit}\nrepeated: ${cfg.repeatedMessages.limit}\ncaps: %${cfg.capsSpam.percent}\npunishment: ${cfg.punishment} (${cfg.timeoutMs / 1000}sn)`);
    }
    if (action === 'flood') cfg.messageFlood.limit = parseInt(v, 10) || cfg.messageFlood.limit;
    else if (action === 'mention') cfg.mentionSpam.limit = parseInt(v, 10) || cfg.mentionSpam.limit;
    else if (action === 'emoji') cfg.emojiSpam.limit = parseInt(v, 10) || cfg.emojiSpam.limit;
    else if (action === 'punish') cfg.punishment = ['timeout', 'kick', 'ban'].includes(v) ? v : cfg.punishment;
    else return message.reply(`${bot.emoji('error')} Geçersiz islem`);
    return message.reply(`${bot.emoji('success')} Anti-spam guncellendi.`);
  }
};
