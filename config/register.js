module.exports = {
  sharedCommands: true,
  prefix: '.',
  intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent'],
  logChannel: '',
  roles: {
    unregistered: '',
    male: '',
    female: '',
    other: '',
    registered: '',
    staff: ''
  },
  channels: {
    register: '',
    log: ''
  },
  welcome: {
    enabled: true,
    message: 'Sunucumuza hos geldin {user}! Kaydin icin bekliyoruz. ({count}. uye)'
  },
  names: {
    ageRequired: true,
    defaultAgeIfMissing: null,
    minAge: 12,
    maxAge: 80,
    pattern: 'name age'
  },
  namesList: [],
  maxWarnBeforeBan: 5,
  staffCooldown: 1
};

