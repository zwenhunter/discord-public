'use strict';


module.exports = {
  name: 'calc',
  description: 'Basit matematik hesaplayıcı (safe parser)',
  usage: '.calc <ifade>',
  permission: 'everyone',
  cooldown: 3,
  async run({ bot, message, args }) {
    const expr = args.join(' ');
    if (!expr) return message.reply(`${bot.emoji('error')} İfade gir.`);
    // güvenli: sadece sayı + +-*/().% boşluk
    if (!/^[\d\s+\-*/().%]+$/.test(expr)) return message.reply(`${bot.emoji('error')} Geçersiz karakter.`);
    try {
      // eslint-disable-next-line no-new-func
      const res = Function('"use strict";return (' + expr + ')')();
      if (typeof res !== 'number' || !isFinite(res)) throw new Error('gecersiz');
      return message.reply(`${expr} = **${res}**`);
    } catch {
      return message.reply(`${bot.emoji('error')} Hesaplanamadi.`);
    }
  }
};

