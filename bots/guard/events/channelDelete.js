'use strict';
const guards = require('../services/guard');

module.exports = {
  event: 'channelDelete',
  once: false,
  async run(bot, channel) {
    await guards.handleChannelDelete(channel);
  }
};
