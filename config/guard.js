const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  sharedCommands: true,
  prefix: '.',
  intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'GuildVoiceStates', 'MessageContent'],
  permission: PermissionFlagsBits.Administrator,
  whitelist: [],
  trustedBots: [],
  trustedRoles: [],
  antiNuke: {
    channelDelete: { limit: 4, interval: 60000, punish: true, restore: true },
    channelCreate: { limit: 6, interval: 60000, punish: true },
    channelUpdate: { limit: 6, interval: 60000, punish: true },
    roleDelete: { limit: 4, interval: 60000, punish: true, restore: true },
    roleCreate: { limit: 6, interval: 60000, punish: true },
    roleUpdate: { limit: 6, interval: 60000, punish: true },
    ban: { limit: 4, interval: 60000, punish: true },
    kick: { limit: 4, interval: 60000, punish: true },
    webhookCreate: { limit: 5, interval: 60000, punish: true },
    webhookDelete: { limit: 5, interval: 60000, punish: true },
    webhookUpdate: { limit: 5, interval: 60000, punish: true },
    botAdd: { limit: 1, interval: 60000, punish: true, requireApproval: true },
    guildUpdate: { limit: 2, interval: 60000, punish: true },
    emojiDelete: { limit: 10, interval: 60000, punish: true },
    emojiCreate: { limit: -1, punish: false },
    integrationUpdate: { limit: 2, interval: 60000, punish: true },
    permissionEscalation: { enabled: true, punish: true },
    dangerousPermissions: ['Administrator', 'BanMembers', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'ManageWebhooks', 'KickMembers'],
    punishment: 'ban' // ban | kick | timeout
  },
  antiRaid: {
    joinFlood: { limit: 8, interval: 30000, action: 'lockdown' },
    accountAgeDays: 7,
    suspiciousAction: 'quarantine', // kick | quarantine
    quarantineRoleId: '', // şüpheli hesap bu role girenler; boşsa sadece loglanır
    lockdownDurationMs: 300000,
    autoUnlock: true
  },
  antiSpam: {
    messageFlood: { limit: 6, interval: 5000, punish: true },
    mentionSpam: { limit: 6, punish: true },
    repeatedMessages: { limit: 5, punish: true },
    inviteSpam: { enabled: true, punish: true },
    linkSpam: { enabled: false, whitelist: ['discord.gg/your-invite'] },
    capsSpam: { percent: 80, minLength: 20, punish: true },
    emojiSpam: { limit: 10, punish: true },
    attachmentSpam: { limit: 8, interval: 10000, punish: true },
    punishment: 'timeout',
    timeoutMs: 600000
  },
  auditLogDelayMs: 1500,
  selfActionEphemeralMs: 3000,
  logChannel: '',
  securityLogChannel: ''
};

