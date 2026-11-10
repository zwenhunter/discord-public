'use strict';
const guards = require('../services/guard');

module.exports = {
  event: 'webhooksUpdate',
  once: false,
  async run(bot, _channel, oldWebhooks, newWebhooks) {
    // olusturulan/silinen webhooklari tespit et
    const created = newWebhooks.filter((w) => !oldWebhooks.some((o) => o.id === w.id));
    const deleted = oldWebhooks.filter((w) => !newWebhooks.some((o) => o.id === w.id));
    for (const w of created.values()) {
      await guards.handleWebhookChange(null, w, 'create');
    }
    for (const w of deleted.values()) {
      await guards.handleWebhookChange(w, null, 'delete');
    }
  }
};
