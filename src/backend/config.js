'use strict';

const path = require('path');
const fs = require('fs');

const configPath = path.resolve(__dirname, '../../config.json');

let raw;
try {
  raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (err) {
  console.error(`[config] Failed to read config.json at ${configPath}:`, err.message);
  process.exit(1);
}

const config = {
  port: raw.port || 3001,
  mongoUrl: raw.mongo_url || 'mongodb://127.0.0.1:27017/rodolog',
  jwtSecret: raw.jwt_secret || 'changeme-jwt-secret',
  jwtExpiresIn: raw.jwt_expires_in || '7d',
  appName: raw.app_name || 'Rodolog',
  appUrl: raw.app_url || 'http://localhost:3000',
  telegram: {
    botToken: raw.telegram_bot_token || '',
    botName: raw.telegram_bot_name || '',
  },
  smtp: {
    host: (raw.smtp && raw.smtp.host) || '',
    port: (raw.smtp && raw.smtp.port) || 587,
    user: (raw.smtp && raw.smtp.user) || '',
    password: (raw.smtp && raw.smtp.password) || '',
    from: (raw.smtp && raw.smtp.from) || '',
  },
};

module.exports = config;
