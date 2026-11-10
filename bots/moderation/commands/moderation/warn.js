'use strict';
const { Warn } = require('../../../../shared/models');
const mod = require('../../services/moderation');
const { ValidationError } = require('../../../../shared/utils/helpers');

module.exports = {
  name: 'warn',
  aliases: ['uyari'],
  description: 'Kullaniciyi uyarir (rol hiyerarşisi kontrolü uygulanır)',
  usage: '.warn <kullanici> [sebep]',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin', 'staff'],
  cooldown: 3,
  async run({ bot, message, args, client }) {
    if (!args[0]) throw new ValidationError('Kullanici gir.');
    const reason = args.slice(1).join(' ') || 'sebep belirtilmedi';
    const { resolveMember } = require('../../../../shared/utils/resolve');
    const member = await resolveMember(client, message.guild, args[0]);
    if (!member) throw new ValidationError('Kullanici bulunamadi.');

    const doc = await Warn.create({ guildId: bot.guildId, userId: member.id, moderatorId: message.author.id, reason });
    const caseDoc = await mod.createCase(bot, { guild: message.guild, targetUserId: member.id, targetTag: member.user.tag, moderatorId: message.author.id, type: 'warn', reason, active: false });
    doc.caseId = caseDoc.caseId;
    await doc.save();
    await mod.sendModLog(bot, message.guild, caseDoc);

    // max warn kontrol: auto punish
    const count = await Warn.countDocuments({ guildId: bot.guildId, userId: member.id, removed: false });
    let autoAction = '';
    const maxWarns = bot.config.warnings?.maxWarns ?? 3;
    if (count >= maxWarns) {
      if (member.moderatable) {
        await member.timeout(3600000, `${count} warn otomatik timeout`);
        autoAction = ' -> otomatik 1 saat timeout';
      }
    }
    return message.reply(`${bot.emoji('success')} **${member.user.tag}** uyari verildi. (Case #${caseDoc.caseId}, toplam ${count})${autoAction}`);
  }
};

