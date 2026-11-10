'use strict';

/**
 * Cooldown + rate limit
 */
class CooldownManager {
  constructor() {
    this.cooldowns = new Map(); // `${commandName}:${userId}` -> exp
    this.globalBuckets = new Map(); // userId -> { count, reset }
  }

  check(commandName, userId, cooldownSec, rateLimit = { count: 10, per: 60 }) {
    const key = `${commandName}:${userId}`;
    const exp = this.cooldowns.get(key);
    const now = Date.now();

    if (exp && exp > now) {
      return { ok: false, remaining: Math.ceil((exp - now) / 1000) };
    }
    if (cooldownSec > 0) this.cooldowns.set(key, now + cooldownSec * 1000);

    // global rate limit
    const rl = this.globalBuckets.get(userId);
    if (!rl || now > rl.reset) {
      this.globalBuckets.set(userId, { count: 1, reset: now + rateLimit.per * 1000 });
    } else {
      rl.count++;
      if (rl.count > rateLimit.count) {
        return { ok: false, remaining: Math.ceil((rl.reset - now) / 1000), reason: 'rate-limit' };
      }
    }

    // cooldown map temizligi (bellek)
    if (this.cooldowns.size > 50000) {
      const nowT = Date.now();
      for (const [k, v] of this.cooldowns) if (v < nowT) this.cooldowns.delete(k);
    }
    return { ok: true, remaining: 0 };
  }

  reset(commandName, userId) {
    this.cooldowns.delete(`${commandName}:${userId}`);
  }
}

module.exports = { CooldownManager };
