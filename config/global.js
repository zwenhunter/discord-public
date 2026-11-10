module.exports = {
  prefix: '.',
  sharedCommands: true,
  mongoUri: process.env.MONGODB_URI,
  redisUrl: process.env.REDIS_URL || '',
  guildId: process.env.GUILD_ID || '',
  ownerIds: (process.env.OWNER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean),
  intents: 0,
  limits: {
    commandCooldownDefault: 3,
    maxReasonLength: 250,
    maxPurgeAmount: 500
  },
  logs: { dir: 'logs', fileLevel: 'info', consoleLevel: 'info' },
  emoji: { dir: 'emojiler' }
};
