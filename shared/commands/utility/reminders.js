'use strict';

module.exports = {
  name: 'reminders',
  aliases: ['hatirlatmalar'],
  description: 'Aktif hatırlatmalarını listeler',
  usage: '.reminders',
  permission: 'everyone',
  cooldown: 5,
  async run({ bot, message }) {
    const { Remind } = require('../../models');
    const docs = await Remind.find({ userId: message.author.id, sent: false, dueAt: { $gt: new Date() } }).sort({ dueAt: 1 }).lean();
    if (!docs.length) return message.reply(`${bot.emoji('info')} Aktif hatırlatma yok.`);
    return message.reply(`**Hatırlatmalar:**\n` + docs.map((d) => `- ${d.text} — <t:${Math.floor(new Date(d.dueAt).getTime() / 1000)}:R>`).join('\n').slice(0, 1500));
  }
};
