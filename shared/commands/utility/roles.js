'use strict';
const { resolveMember } = require('../../utils/resolve');

module.exports = {
  name: 'roles',
  aliases: ['roller'],
  description: 'Sunucudaki rolleri listeler',
  usage: '.roles',
  permission: 'everyone',
  cooldown: 5,
  async run({ bot, message }) {
    const roles = [...message.guild.roles.cache.values()].sort((a, b) => b.position - a.position);
    const lines = roles.map((r) => `${r.name} (${r.members.size} uye)`);
    const m = ['```'].concat(lines).splice(0, 30);
    return message.reply(m.join('\n') + '```' + (roles.length > 30 ? `\n... +${roles.length - 30} rol daha` : ''));
  }
};

