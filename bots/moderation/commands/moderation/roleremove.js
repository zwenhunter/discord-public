'use strict';
const { resolveMember, resolveRole } = require('../../../../shared/utils/resolve');
const { ValidationError } = require('../../../../shared/utils/helpers');

module.exports = {
  name: 'roleremove',
  aliases: ['rremove'],
  description: 'Kullanicidan rol al',
  usage: '.roleremove <kullanici> <rol>',
  permission: ['bot-owner', 'guild-owner', 'mod', 'admin'],
  cooldown: 3,
  async run({ bot, message, args, client }) {
    if (args.length < 2) throw new ValidationError('Eksik arguman.');
    const member = await resolveMember(client, message.guild, args[0]);
    const role = resolveRole(message.guild, args[1]);
    if (!member || !role) throw new ValidationError('Kullanici ya da rol bulunamadi.');
    if (role.position >= message.guild.members.me.roles.highest.position) throw new ValidationError('Rol benim rolunden yuksek.');
    await member.roles.remove(role);
    return message.reply(`${bot.emoji('success')} ${member.user.tag} \u2190 ${role.name}`);
  }
};

