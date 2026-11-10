'use strict';

module.exports = {
  event: 'voiceStateUpdate',
  run: async (bot, oldState, newState) => {
    await bot.voiceTracker.handleStateChange(oldState, newState);
  }
};
