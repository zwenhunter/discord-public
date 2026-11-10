'use strict';

module.exports = {
  name: 'dbstat',
  description: 'MongoDB durum kontrolu (ping, collections)',
  usage: '.dbstat',
  permission: ['bot-owner', 'guild-owner', 'admin'],
  cooldown: 15,
  async run({ bot, message }) {
    const { pingDatabase, dbState } = require('../../database');
    let res = { ok: false, state: dbState() };
    try { res = await pingDatabase(); } catch { /* yok */ }
    let colCount = 'unknown';
    let idxCount = 'unknown';
    try {
      if (res.ok) {
        const conn = require('mongoose').connection;
        colCount = (await conn.db.listCollections().toArray()).length;
        idxCount = (await conn.db.command({ listIndexes: 'cases', cursor: {} }).catch(() => null)) ? 'ok' : 'ok';
      }
    } catch { /* yok */ }
    return message.reply([
      `DB state: **${res.state}**`,
      `Ping: **${res.ok ? 'OK' : 'FAIL'}**`,
      `Collections: **${res.ok ? colCount : '-'}**`
    ].join('\n'));
  }
};
