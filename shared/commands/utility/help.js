'use strict';

module.exports = {
  name: 'help',
  aliases: ['yardim', 'komutlar'],
  description: 'Komut listesini ve kategorileri gösterir',
  usage: '.help [komut]',
  permission: 'everyone',
  cooldown: 3,
  async run({ bot, message, args }) {
    const cmds = bot.commands.commands;
    if (args[0]) {
      const name = cmds.has(args[0].toLowerCase()) ? args[0].toLowerCase() : bot.commands.aliases.get(args[0].toLowerCase());
      const c = name ? cmds.get(name) : null;
      if (!c) return message.reply(`${bot.emoji('error')} Komut bulunamadi.`);
      return message.reply([
        `**${c.name}** (aliases: ${c.aliases.join(', ') || '-'})`,
        c.description,
        `Kullanim: \`${c.usage}\``,
        `Kategori: ${c.category} — Cooldown: ${(c.cooldown ?? 3)}sn`,
        `Yetki: ${Array.isArray(c.permission) ? c.permission.join(' | ') : String(c.permission)}`
      ].join('\n'));
    }
    const byCat = {};
    for (const c of cmds.values()) {
      (byCat[c.category || 'genel'] ||= []).push(c.name);
    }
    let out = `**${bot.name} botunun komutlari (${cmds.size}):**\n`;
    for (const [cat, list] of Object.entries(byCat)) {
      out += `\n**${cat}** (${list.length}):\n` + list.sort().join(', ') + '\n';
    }
    // aşağıdaki batırdan content'i 2000 altında tut
    return message.reply(out.slice(0, 1950) + `\nDetay: \`.help <komut>\``);
  }
};

