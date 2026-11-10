'use strict';
const guards = require('../services/guard');

module.exports = {
  event: 'roleCreate',
  once: false,
  async run(bot, role) {
    await guards.handleRoleCreate(role);
  }
};
