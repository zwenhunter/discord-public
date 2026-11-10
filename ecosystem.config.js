'use strict';

const pm2Bin = process.execPath && 'node_modules/pm2/bin/pm2';
module.exports = {
  apps: [
    {
      name: 'guard',
      script: 'bots/guard/index.js',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      kill_timeout: 5000,
      wait_ready: false,
      restart_delay: 5000,
      max_memory_restart: '600M',
      env: { NODE_ENV: 'production' },
      time: true
    },
    {
      name: 'moderation',
      script: 'bots/moderation/index.js',
      autorestart: true,
      max_restarts: 10,
      kill_timeout: 5000,
      restart_delay: 5000,
      max_memory_restart: '600M'
    },
    {
      name: 'statistics',
      script: 'bots/statistics/index.js',
      autorestart: true,
      max_restarts: 10,
      kill_timeout: 5000,
      restart_delay: 5000,
      max_memory_restart: '500M'
    },
    {
      name: 'guildtag',
      script: 'bots/guildtag/index.js',
      autorestart: true,
      max_restarts: 10,
      kill_timeout: 5000,
      restart_delay: 5000,
      max_memory_restart: '500M'
    },
    {
      name: 'register',
      script: 'bots/register/index.js',
      autorestart: true,
      max_restarts: 10,
      kill_timeout: 5000,
      restart_delay: 5000,
      max_memory_restart: '400M'
    }
  ]
};
