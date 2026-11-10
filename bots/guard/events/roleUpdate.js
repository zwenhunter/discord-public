'use strict';
const guards = require('../services/guard');

module.exports = {
  event: 'roleUpdate',
  once: false,
  async run(bot, oldRole, newRole) {
    await guards.handleRoleUpdate(oldRole, newRole);
  }
};
