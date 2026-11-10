'use strict';
const guards = require('../services/guard');

module.exports = {
  event: 'roleDelete',
  once: false,
  async run(bot, role) {
    await guards.handleRoleDelete(role);
  }
};
