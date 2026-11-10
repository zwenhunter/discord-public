'use strict';
const { Register: RegModel, MemberStat } = require('../../../../shared/models');
const { ValidationError } = require('../../../../shared/utils/helpers');
const { resolveMember } = require('../../../../shared/utils/resolve');

module.exports = {
  name: 'kayıtreset',
  aliases: ['registerreset'],
  description: 'Kullanicinin tum kayit geçmisini siler, rolleri kayıtsıza döner',
  usage: '.kayıtreset <@kullanici>',
  permission: ['bot-owner', 'guild-owner', 'admin'],
  cooldown: 10,
  async run({ bot, message, args, client }) {
    if (!args[0]) throw new ValidationError('Kullanici gir.');
    const member = await resolveMember(client, message.guild, args[0]);
    if (!member) return message.reply(`${bot.emoji('error')} Kullanici bulunamadi.`);
    if (message.guild.ownerId !== message.author.id && !message.member.permissions.has('Administrator')) {
      return message.reply(`${bot.emoji('error')} Bu işlem için admin olman gerek.`);
    }
    const docs = await RegModel.find({ guildId: bot.guildId, userId: member.id, cancelled: false });
    for (const doc of docs) {
      doc.cancelled = true;
      await doc.save();
    }
    const roles = [...new Set(docs.flatMap((d) => d.rolesGiven || []))];
    if (roles.length) await member.roles.remove(roles, `kayıtreset by ${message.author.tag}`);
    if (bot.config.roles.unregistered) await member.roles.add(bot.config.roles.unregistered, 'kayıtreset').catch(() => {});
    if (bot.config.roles.registered) await member.roles.remove(bot.config.roles.registered, 'kayıtreset').catch(() => {});
    await bot.log.log('REGISTER', 'register_reset', { userId: member.id, moderatorId: message.author.id, deletedDocs: docs.length });
    return message.reply(`${bot.emoji('success')} **${member.user.tag}** ${docs.length} kayıti resetlendi.`);
  }
};

