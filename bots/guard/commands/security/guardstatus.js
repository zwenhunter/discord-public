'use strict';
const guards = require('../../services/guard');

module.exports = {
  name: 'guardstatus',
  aliases: ['guvenlikdurum', 'gstat'],
  description: 'Guard bot durumunu ve aktif korumalari gosterir',
  usage: '.guardstatus',
  permission: ['bot-owner', 'guild-owner', 'admin'],
  cooldown: 10,
  async run({ bot, message }) {
    const cfg = bot.config.antiNuke;
    const raid = bot.config.antiRaid;
    const spam = bot.config.antiSpam;
    const st = guards.state();
    const lines = [
      `**Anti-Nuke** kanal-sil:${cfg.channelDelete.limit} rol-sil:${cfg.roleDelete.limit} ban:${cfg.ban.limit} kick:${cfg.kick.limit} webhook:${cfg.webhookCreate.limit} bot-ekle:${cfg.botAdd.limit}`,
      `**Punishment:** ${cfg.punishment}`,
      `**Anti-Raid** join-flood:${raid.joinFlood.limit}/${raid.joinFlood.interval / 1000}sn hesap-yas:${raid.accountAgeDays}g lock:${raid.lockdownDurationMs / 1000}sn`,
      `**Anti-Spam** flood:${spam.messageFlood.limit}/${spam.messageFlood.interval / 1000}sn mention:${spam.mentionSpam.limit} emoji:${spam.emojiSpam.limit} punish:${spam.punishment}`,
      `**Whitelist:** ${(bot.config.whitelist || []).length} kayit`,
      `**Lockdown:** ${st && st.lockdownActive ? 'AKTIF' : 'kapali'}`,
      `**DB:** ${bot.name} aktif`
    ];
    return message.reply(lines.join('\n'));
  }
};
