'use strict';
const guards = require('../services/guard');

module.exports = {
  event: 'channelCreate',
  once: false,
  async run(bot, channel) {
    await guards.handleChannelCreate(channel);
  }
};
