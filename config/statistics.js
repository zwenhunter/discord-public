module.exports = {
  sharedCommands: true,
  prefix: '.',
  intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'GuildVoiceStates', 'MessageContent'],
  logChannel: '',
  channels: { excludeStatChannelIds: [] },
  statistics: {
    messageCollection: true,
    voiceCollection: true,
    afkTimeoutMs: 300000,
    memberGrowthIntervalMs: 3600000,
    adminStatEnabled: true
  }
};

