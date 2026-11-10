'use strict';

module.exports = {
  name: 'antiraid',
  aliases: ['araid'],
  description: 'Anti-raid ayarlari (liste/limit/yas/action)',
  usage: '.antiraid <liste|limit|yas|action> [deger]',
  permission: ['bot-owner', 'guild-owner'],
  cooldown: 5,
  async run({ bot, message, args }) {
    const action = (args[0] || 'liste').toLowerCase();
    const cfg = bot.config.antiRaid;
    if (action === 'liste') {
      return message.reply(`joinFlood: ${cfg.joinFlood.limit}/${cfg.joinFlood.interval / 1000}sn\naccountAge: ${cfg.accountAgeDays}gun\naction: ${cfg.suspiciousAction}\nlockdownSure: ${cfg.lockdownDurationMs / 1000}sn\nautoUnlock: ${cfg.autoUnlock}`);
    }
    const v = args[1];
    if (action === 'limit') cfg.joinFlood.limit = parseInt(v, 10) || cfg.joinFlood.limit;
    else if (action === 'yas') cfg.accountAgeDays = parseInt(v, 10) || cfg.accountAgeDays;
    else if (action === 'action') cfg.suspiciousAction = ['kick', 'none'].includes(v) ? v : cfg.suspiciousAction;
    else return message.reply(`${bot.emoji('error')} Geçersiz islem`);
    return message.reply(`${bot.emoji('success')} Guncel antiraid: ${cfg.joinFlood.limit} join / ${cfg.joinFlood.interval / 1000}sn; yas<${cfg.accountAgeDays} -> ${cfg.suspiciousAction}`);
  }
};
