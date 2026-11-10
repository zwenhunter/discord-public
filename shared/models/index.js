'use strict';
const mongoose = require('mongoose');

const { Schema } = mongoose;

// ---------- Ornek / genel ----------
const GuildSettingsSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  prefix: { type: String, default: '.' },
  settings: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

const EmojiRegistrySchema = new Schema({
  guildId: { type: String, required: true },
  key: { type: String, required: true },
  name: { type: String, required: true },
  emojiId: { type: String, required: true },
  animated: { type: Boolean, default: false },
  format: { type: String, default: 'png' },
  uploadedAt: { type: Date, default: Date.now }
}, { timestamps: true });
EmojiRegistrySchema.index({ guildId: 1, key: 1 }, { unique: true });

const GuildLogSchema = new Schema({
  guildId: { type: String, required: true },
  bot: { type: String, required: true },
  category: { type: String, required: true }, // GUARD | MODERATION | ...
  type: { type: String, required: true },
  userId: String,
  targetId: String,
  data: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
}, { capped: { size: 10000000, auto: true } });
GuildLogSchema.index({ guildId: 1, createdAt: -1 });
GuildLogSchema.index({ guildId: 1, category: 1, createdAt: -1 });

const SecurityEventSchema = new Schema({
  guildId: String,
  type: String,
  executorId: String,
  targetId: String,
  approved: { type: Boolean, default: false },
  data: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});
SecurityEventSchema.index({ guildId: 1, createdAt: -1 });

// ---------- Moderasyon ----------
const CaseSchema = new Schema({
  guildId: { type: String, required: true },
  caseId: { type: Number, required: true },
  targetUserId: { type: String, required: true },
  targetTag: { type: String, default: '' },
  moderatorId: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ['ban', 'unban', 'softban', 'tempban', 'kick', 'timeout', 'untimeout', 'mute', 'unmute', 'tempmute', 'jail', 'unjail', 'tempjail', 'warn', 'unwarn', 'purge', 'lock', 'unlock', 'slowmode', 'nick', 'resetnick', 'roleadd', 'roleremove', 'automod', 'other']
  },
  reason: { type: String, default: '' },
  data: { type: Schema.Types.Mixed, default: {} },
  durationMs: { type: Number, default: 0 }, // 0 = permanent
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
  resolvedAt: { type: Date, default: null },
  resolvedBy: { type: String, default: null },
  appeal: {
    published: { type: Boolean, default: false },
    content: { type: String },
    decidedBy: { type: String },
    result: { type: String, enum: ['granted', 'denied', null], default: null },
    decidedAt: { type: Date }
  }
}, { timestamps: true });
CaseSchema.index({ guildId: 1, caseId: 1 }, { unique: true });
CaseSchema.index({ guildId: 1, targetUserId: 1, createdAt: -1 });
CaseSchema.index({ guildId: 1, moderatorId: 1, createdAt: -1 });
CaseSchema.index({ guildId: 1, type: 1 });
CaseSchema.index({ guildId: 1, active: 1, expiresAt: 1 });
CaseSchema.index({ expiresAt: 1, active: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { active: true, durationMs: { $gt: 0 } }, name: 'tempPunishmentExpire' });

const WarnSchema = new Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  moderatorId: { type: String, required: true },
  reason: { type: String, default: '' },
  removed: { type: Boolean, default: false },
  caseId: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });
WarnSchema.index({ guildId: 1, userId: 1, createdAt: -1 });

// ---------- Istatistik ----------
const MessageStatSchema = new Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  channelId: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  count: { type: Number, default: 0 }
}, { timestamps: true });
MessageStatSchema.index({ guildId: 1, userId: 1, date: 1 }, { unique: true });
MessageStatSchema.index({ guildId: 1, date: 1 });
MessageStatSchema.index({ guildId: 1, channelId: 1, date: 1 });

const VoiceStatSchema = new Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  channelId: { type: String, default: null },
  date: { type: String, required: true },
  seconds: { type: Number, default: 0 }
}, { timestamps: true });
VoiceStatSchema.index({ guildId: 1, userId: 1, date: 1, channelId: 1 }, { unique: true });
VoiceStatSchema.index({ guildId: 1, date: 1 });

const MemberStatSchema = new Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  messages: { type: Number, default: 0 },
  voiceSeconds: { type: Number, default: 0 },
  registeredCount: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });
MemberStatSchema.index({ guildId: 1, userId: 1 }, { unique: true });
MemberStatSchema.index({ guildId: 1, messages: -1 });
MemberStatSchema.index({ guildId: 1, voiceSeconds: -1 });

const InviteStatSchema = new Schema({
  guildId: String,
  inviterId: String,
  code: String,
  uses: { type: Number, default: 0 },
  left: { type: Number, default: 0 }
}, { timestamps: true });
InviteStatSchema.index({ guildId: 1, inviterId: 1 });

const GuildGrowthSchema = new Schema({
  guildId: { type: String, required: true },
  date: { type: String, required: true },
  memberCount: Number,
  humans: Number,
  bots: Number,
  online: Number
}, { timestamps: true });
GuildGrowthSchema.index({ guildId: 1, date: 1 }, { unique: true });

// ---------- Guild Tag ----------
const TagSchema = new Schema({
  guildId: { type: String, required: true },
  tag: { type: String, required: true },
  name: { type: String, required: true },
  roleId: { type: String, default: '' },
  registeredRoleId: { type: String, default: '' },
  staffRole: { type: String, default: '' },
  chatChannel: { type: String, default: '' },
  notifyChannel: { type: String, default: '' },
  taglogChannel: { type: String, default: '' },
  whitelist: [{ type: String }],
  blacklist: [{ type: String }],
  stats: {
    joinedTotal: { type: Number, default: 0 },
    leftTotal: { type: Number, default: 0 }
  },
  enabled: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });
TagSchema.index({ guildId: 1, tag: 1 }, { unique: true });

const TagUserSchema = new Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  tag: { type: String, default: '' },
  joinedAt: { type: Date, default: null },
  leftAt: { type: Date, default: null },
  history: [{ tag: String, joinedAt: Date, leftAt: Date, action: String }]
}, { timestamps: true });
TagUserSchema.index({ guildId: 1, userId: 1 }, { unique: true });
TagUserSchema.index({ guildId: 1, tag: 1 });

// ---------- Register ----------
const RegisterSchema = new Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  staffId: { type: String, required: true },
  name: { type: String, required: true },
  age: { type: Number, default: null },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
  rolesGiven: [{ type: String }],
  rolesRemoved: [{ type: String }],
  cancelled: { type: Boolean, default: false },
  caseId: { type: Number, default: null }
}, { timestamps: true });
RegisterSchema.index({ guildId: 1, userId: 1, createdAt: -1 });
RegisterSchema.index({ guildId: 1, staffId: 1, createdAt: -1 });

// ---------- Startup ----------
const StartupSchema = new Schema({
  bot: { type: String, required: true },
  guildId: String,
  version: String,
  startedAt: { type: Date, default: Date.now }
});

const RemindSchema = new Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  channelId: { type: String, required: true },
  text: { type: String, required: true },
  dueAt: { type: Date, required: true },
  sent: { type: Boolean, default: false }
}, { timestamps: true });
RemindSchema.index({ dueAt: 1, sent: 1 });

module.exports = {
  GuildSettings: mongoose.models.GuildSettings || mongoose.model('GuildSettings', GuildSettingsSchema),
  EmojiRegistry: mongoose.models.EmojiRegistry || mongoose.model('EmojiRegistry', EmojiRegistrySchema),
  GuildLog: mongoose.models.GuildLog || mongoose.model('GuildLog', GuildLogSchema),
  SecurityEvent: mongoose.models.SecurityEvent || mongoose.model('SecurityEvent', SecurityEventSchema),
  Case: mongoose.models.Case || mongoose.model('Case', CaseSchema),
  Warn: mongoose.models.Warn || mongoose.model('Warn', WarnSchema),
  MessageStat: mongoose.models.MessageStat || mongoose.model('MessageStat', MessageStatSchema),
  VoiceStat: mongoose.models.VoiceStat || mongoose.model('VoiceStat', VoiceStatSchema),
  MemberStat: mongoose.models.MemberStat || mongoose.model('MemberStat', MemberStatSchema),
  InviteStat: mongoose.models.InviteStat || mongoose.model('InviteStat', InviteStatSchema),
  GuildGrowth: mongoose.models.GuildGrowth || mongoose.model('GuildGrowth', GuildGrowthSchema),
  Tag: mongoose.models.Tag || mongoose.model('Tag', TagSchema),
  TagUser: mongoose.models.TagUser || mongoose.model('TagUser', TagUserSchema),
  Register: mongoose.models.Register || mongoose.model('Register', RegisterSchema),
  Remind: mongoose.models.Remind || mongoose.model('Remind', RemindSchema),
  Startup: mongoose.models.Startup || mongoose.model('Startup', StartupSchema)
};
