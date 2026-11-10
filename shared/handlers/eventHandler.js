'use strict';

/**
 * Event Handler
 * - events dosyalarini tarar, Discord.js client'a baglar
 * - `messageCreate`,`messageDelete`,`interactionCreate` gibi eventler mod fonksiyonu
 */
const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, file.name);
    if (file.isDirectory()) out.push(...walkDir(p));
    else if (file.name.endsWith('.js')) out.push(p);
  }
  return out;
}

class EventHandler {
  constructor(bot) {
    this.bot = bot;
    this.client = bot.client;
    this.logger = bot.logger;
    this.events = new Map();
  }

  load() {
    const dir = path.join(this.bot.dir, 'events');
    let count = 0;
    for (const file of walkDir(dir)) {
      try {
        delete require.cache[require.resolve(file)];
        const mod = require(file);
        if (!mod || !mod.event) {
          this.logger.error(`Event dosyasi gecersiz (event tanimli degil): ${file}`);
          continue;
        }
        if (typeof mod.run !== 'function') {
          this.logger.error(`Event dosyasinda run fonksiyonu yok: ${file}`);
          continue;
        }
        this.events.set(mod.event, mod);
        const once = !!mod.once;
        this.client[once ? 'once' : 'on'](mod.event, (obj, ...rest) => {
          Promise.resolve(mod.run(this.bot, obj, ...rest)).catch((err) => {
            this.logger.error(`Event error [${mod.event}]: ${err.stack || err.message}`);
          });
        });
        count++;
      } catch (err) {
        this.logger.error(`Event yuklenemedi: ${file} - ${err.message}`);
      }
    }
    this.logger.info(`${count} event yuklendi`);
    return count;
  }
}

module.exports = { EventHandler };
