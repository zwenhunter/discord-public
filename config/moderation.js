module.exports = {
  sharedCommands: true,
  prefix: '.',
  intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent'],
  logChannel: '',
  staffRoles: [],
  jailRole: '',
  jailRoles: [],
  registerRoles: [],
  punishments: {
    warn: { maxWarns: 3, action: 'timeout', timeoutMs: 3600000 },
    defaultBanHours: 24,
    defaultTimeoutMinutes: 30,
    defaultMuteMinutes: 30
  },
  automod: {
    badWords: {
      enabled: true,
      list: ['küfür1', 'küfür2'],
      punishment: 'warn'
    },
    inviteFilter: { enabled: true, punishment: 'delete', exemptChannelIds: [] },
    linkFilter: { enabled: false, whitelist: [], punishment: 'delete' },
    spamFilter: { enabled: true, limit: 6, interval: 5000, punishment: 'timeout', timeoutMs: 600000 },
    floodDetection: { enabled: true, limit: 10, interval: 10000 },
    capsDetection: { enabled: true, percent: 80, minLength: 20, punishment: 'warn' },
    mentionLimit: { enabled: true, limit: 6, punishment: 'timeout', timeoutMs: 1800000 },
    repeatedMessages: { enabled: true, limit: 5, punishment: 'delete' },
    suspiciousAccount: { enabled: true, accountAgeDays: 3, punishment: 'kick' },
    autoWarning: true,
    autoTimeout: true
  },
  unauthorizedPermChannels: [],
  clearExemptRoleIds: []
};

