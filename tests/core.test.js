import { describe, it, expect } from 'vitest';
import { CooldownManager } from '../shared/handlers/cooldown';
import { checkPermission } from '../shared/permissions';
import { parseDuration, humanizeDuration, resolveRole, resolveChannel } from '../shared/utils/resolve';
import { EmojiManager } from '../shared/emoji';
import { chunk, validSnowflake, escapeRegex, ValidationError } from '../shared/utils/helpers';
import { loadGlobalConfig } from '../shared/config';

describe('CooldownManager', () => {
  it('per-command cooldown uygulayir', () => {
    const c = new CooldownManager();
    const r1 = c.check('ban', 'u1', 5);
    expect(r1.ok).toBe(true);
    const r2 = c.check('ban', 'u1', 5);
    expect(r2.ok).toBe(false);
    expect(r2.remaining).toBeGreaterThan(0);
  });
  it('farkli kullanicilar etkiilenmez', () => {
    const c = new CooldownManager();
    expect(c.check('ban', 'u2', 5).ok).toBe(true);
  });
  it('ikinci farkli komut ayrı cooldown', () => {
    const c = new CooldownManager();
    c.check('ban', 'u2', 5);
    expect(c.check('kick', 'u2', 0).ok).toBe(true);
  });
  it('rate limit: per-60 15 ustunde engeller', () => {
    const c = new CooldownManager();
    let blocked = null;
    for (let i = 0; i < 20; i++) {
      const r = c.check('x' + i, 'ur', 0, { count: 10, per: 60 });
      if (!r.ok) { blocked = r; break; }
    }
    expect(blocked).toBeTruthy();
    expect(blocked.reason).toBe('rate-limit');
  });
});

describe('PermissionManager', () => {
  function makeBot(owners = [], staffRoles = []) {
    return { global: { ownerIds: owners }, config: { staffRoles } };
  }
  it('bot owner her zaman geçer', async () => {
    const client = { ecosystem: makeBot(['99']) };
    const member = { id: '99', permissions: { has: () => false }, roles: { cache: new Map() } };
    const res = await checkPermission({ client, guild: {}, member, command: { permission: 'bot-owner' } });
    expect(res.ok).toBe(true);
  });
  it('everyone', async () => {
    const client = { ecosystem: makeBot() };
    const member = { id: '100', permissions: { has: () => false }, roles: { cache: new Map() } };
    const res = await checkPermission({ client, guild: {}, member, command: { permission: 'everyone' } });
    expect(res.ok).toBe(true);
  });
  it('yetkisiz kullanım engellenir', async () => {
    const client = { ecosystem: makeBot() };
    const member = { id: '100', permissions: { has: () => false }, roles: { cache: new Map() } };
    const res = await checkPermission({ client, guild: {}, member, command: { permission: 'admin' } });
    expect(res.ok).toBe(false);
  });
  it('guild-owner geç', async () => {
    const client = { ecosystem: makeBot() };
    const member = { id: '100', permissions: { has: () => false }, roles: { cache: new Map() } };
    const res = await checkPermission({ client, guild: { ownerId: '100' }, member, command: { permission: ['bot-owner', 'guild-owner'] } });
    expect(res.ok).toBe(true);
  });
});

describe('resolve utils', () => {
  it('parse correct durations', () => {
    expect(parseDuration('1d')).toBe(86400000);
    expect(parseDuration('2h30m')).toBe(2 * 3600000 + 30 * 60000);
    expect(parseDuration('10s')).toBe(10000);
    expect(parseDuration('abc')).toBe(null);
  });
  it('humanizeDuration', () => {
    expect(humanizeDuration(90000)).toContain('1dk');
    expect(humanizeDuration(0)).toBe('0sn');
  });
  it('resolveRole handles mention/id/name', () => {
    const guild = { roles: { cache: { get: (id) => ({ id }), find: (f) => ({ name: 'Mod' }) } } };
    expect(resolveRole(guild, '<@&123456789012345678>').id).toBe('123456789012345678');
    expect(resolveRole(guild, '123456789012345678').id).toBe('123456789012345678');
  });
  it('resolveChannel', () => {
    const guild = { channels: { cache: { get: (id) => ({ id }), find: () => null } } };
    expect(resolveChannel(guild, '<#123456789012345678>').id).toBe('123456789012345678');
    expect(resolveChannel(guild, 'nope')).toBe(null);
  });
});

describe('EmojiManager', () => {
  it('key derivation', () => {
    expect(EmojiManager.keyFromFile('genel', '53136-verified.png')).toBe('genel_verified');
    expect(EmojiManager.keyFromFile('genel oklar', '15072-animated-arrow-pink2.gif')).toBe('genel_oklar_animated_arrow_pink2');
  });
  it('render fallback', () => {
    const em = new EmojiManager();
    expect(em.render('genel_success')).toBe('[OK]');
    expect(em.render('genel_error')).toBe('[X]');
    expect(em.render('unknown_thing')).toBe('»');
  });
});

describe('helpers', () => {
  it('chunk', () => { expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]); });
  it('validSnowflake', () => { expect(validSnowflake('123456789012345678')).toBe(true); expect(validSnowflake('12')).toBe(false); });
  it('escapeRegex', () => { expect(escapeRegex('a.b+c')).toBe('a\\.b\\+c'); });
  it('ValidationError with usage', () => {
    const e = new ValidationError('eksik arg', '.ban <kullanici>');
    expect(e.usage).toBe('.ban <kullanici>');
  });
});

describe('Global config', () => {
  it('yuklenir ve geçerli alanları içerir', () => {
    const g = loadGlobalConfig();
    expect(g.prefix).toBe('.');
    expect(g.emoji.dir).toBe('emojiler');
    expect(typeof g.limits.maxPurgeAmount).toBe('number');
  });
});
