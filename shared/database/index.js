'use strict';
const mongoose = require('mongoose');

const connStateToString = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
};

async function connectDatabase(uri, logger) {
  if (!uri || typeof uri !== 'string') throw new Error('MONGODB_URI tanimli degil!');
  mongoose.set('strictQuery', true);
  mongoose.connection.on('connected', () => logger && logger.info(`Database baglandi: ${safeUri(uri)}`));
  mongoose.connection.on('disconnected', () => logger && logger.warn('Database baglantisi kesildi'));
  mongoose.connection.on('error', (err) => logger && logger.error(`Database error: ${err && err.message}`));
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
    maxPoolSize: 20
  });
  return mongoose.connection;
}

function safeUri(uri) {
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//[REDACTED]@');
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

async function pingDatabase() {
  if (mongoose.connection.readyState !== 1) return { ok: false, state: connStateToString[mongoose.connection.readyState] };
  const res = await mongoose.connection.db.admin().ping();
  return { ok: !!res && res.ok === 1, state: 'connected' };
}

function dbState() {
  return connStateToString[mongoose.connection.readyState] || 'unknown';
}

async function ensureIndexes() {
  const models = ['Case', 'GuildSettings', 'EmojiRegistry', 'Stat', 'VoiceStat', 'MemberStat', 'GuildLog', 'Tag', 'TagUser', 'Register', 'Warn', 'Punishment', 'RaidLog', 'SecurityEvent', 'GuildTagHistory', 'Startup', 'GuildBackup', 'NukeCounter'];
  for (const n of models) {
    const M = mongoose.models[n];
    if (M && typeof M.syncIndexes === 'function') {
      try { await M.syncIndexes(); } catch (e) { /* indexlidir ama fail olursa sessizce logla */ }
    }
  }
}

module.exports = { connectDatabase, disconnectDatabase, pingDatabase, dbState, ensureIndexes };
