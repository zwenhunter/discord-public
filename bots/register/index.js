'use strict';
const { Bot } = require('../../shared/handlers/bot');
const regSvc = require('./services/register');

class RegisterBot extends Bot {
  constructor() {
    super('register');
  }

  async postLogin() {
    await this.loadDBGuildEmojis();
  }

  emoji(key) {
    // register emojiler该国
    const map = {
      'success': 'genel_53136-verified',
      'male': 'genel_6067-male',
      'female': 'genel_52094-female',
      'wand': 'genel_44216-vip'
    };
    const target = map[key];
    if (this.emojiKeyToDiscord) {
      const e = this.emojiKeyToDiscord.get(target || key);
      if (e) return e.toString();
    }
    return '»';
  }
}

module.exports = RegisterBot;
