'use strict';
const { resolveRole } = require('../../../../shared/utils/resolve');
const { ValidationError } = require('../../../../shared/utils/helpers');

module.exports = {
  name: 'roleinfo',
  aliases: ['rolinfo'],
  description: 'Rol bilgisi',
  usage: '.roleinfo <rol>',
  permission: 'everyone',
  cooldown: 3,
  async run({ bot, message, args }) {
    const role = resolveRole(message.guild, args[0]);
    if (!role) throw new ValidationError('Rol bulunamadi.');
    const members = role.members.map((m) => `<@${m.id}>`);
    return message.reply([
      `**Rol:** ${role.name} (${role.id})`,
      `**Renk:** ${role.hexColor}   **Pozisyon:** ${role.position}/${role.guild.roles.cache.size}`,
      `**Tagli (mentionable):** ${role.mentionable ? 'yes' : 'no'}   **Ayri (hoist):** ${role.hoist ? 'yes' : 'no'}`,
      `**Uye sayisi:** ${members.length}`,
      `**.Sorununu:** ${members.slice(0, 10).join(', ')}${members.length > 10 ? ` +${members.length - 10}` : ''}`,
      `**Permissions:** ${role.permissions.bitfield}`
    ].join('\n'));
  }
};

