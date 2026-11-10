'use strict';
const path = require('path');
const fs = require('fs');
const { loadEmojiFromFileBuffer } = require('./guildPatch');

/**
 * Merkezi Emoji Manager
 * - emojiler/ klasorunu tarar, dosya adlarindan anahtar uretir.
 * - emojikur ile yuklenen emojilerin Discord ID'lerini Mongo'ya kaydeder.
 * - buildEmojiString('ANAHTAR') veya default anahtar bulunamazsa metin fallback dondurur.
 */
const FALLBACK_PREFIX = {
  success: '[OK]',
  error: '[X]',
  warning: '[!]',
  info: '[i]',
  loading: '[~]'
};

class EmojiManager {
  constructor(awaitReady = () => {}, onReady = () => {}) {
    this.awaitReady = awaitReady;
    this.onReady = onReady;
    this.files = new Map(); // key -> { category, file, format }
  }

  static keyFromFile(category, filename) {
    // '53136-verified.png' -> 'genel_verified'
    const base = path.basename(filename, path.extname(filename));
    const cleaned = base.replace(/^\d+-/, '');
    const key = `${category}_${cleaned}`.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
    return key;
  }

  loadFromDisk(baseDir) {
    if (!fs.existsSync(baseDir)) return 0;
    let count = 0;
    for (const category of fs.readdirSync(baseDir, { withFileTypes: true })) {
      if (!category.isDirectory()) continue;
      const catDir = path.join(baseDir, category.name);
      for (const f of fs.readdirSync(catDir)) {
        const ext = path.extname(f).toLowerCase();
        if (!['.png', '.gif', '.jpg', '.webp'].includes(ext)) continue;
        const key = EmojiManager.keyFromFile(category.name, f);
        this.files.set(key, { category: category.name, file: path.join(catDir, f), format: ext.replace('.', '') });
        count++;
      }
    }
    return count;
  }

  /**
   * Discord'a yuklenen emojilerde key -> { id, animated }
   */
  cacheLoaded(guildEmojis) {
    this.keyToEmoji = guildEmojis; // Collection from guild.emojis.cache, name = key
  }

  /**
   * Kullanicinin goruntuleyebilecegi markdown string.
   * Bulunamazsa emojimizin yuklu olma durumuna gore metin fallback doner.
   */
  render(key) {
    if (this.keyToEmoji) {
      const emoji = this.keyToEmoji.find((e) => e.name === key);
      if (emoji) return emoji.toString();
    }
    for (const fb of Object.keys(FALLBACK_PREFIX)) {
      if (key.includes(fb)) return FALLBACK_PREFIX[fb];
    }
    return '»';
  }

  /**
   * .emojikur icin dosya get (attachment formatinda discord'a yuklenir)
   */
  getFile(key, category) {
    if (category) return this.files.get(`${category}_${key}`.toLowerCase());
    return this.files.get(String(key).toLowerCase());
  }

  allFiles() {
    return [...this.files.entries()].map(([key, v]) => ({ key, ...v }));
  }

  async uploadEmoji(guild, fileBuffer, name, ext) {
    await loadEmojiFromFileBuffer(guild, fileBuffer, name, ext);
  }
}

module.exports = { EmojiManager };
