'use strict';

const crypto = require('crypto');

/**
 * Verify Telegram Login Widget authentication data.
 *
 * Per Telegram docs:
 * 1. Create data-check-string: all fields except 'hash', sorted alphabetically, joined with '\n'
 * 2. Compute HMAC-SHA256 with key = SHA256(bot_token)
 * 3. Compare computed hex with data.hash
 * 4. Check auth_date is within 24 hours
 *
 * @param {object} data - Telegram auth object (id, first_name, auth_date, hash, ...)
 * @param {string} botToken - Telegram bot token
 * @returns {boolean}
 */
function verifyTelegramAuth(data, botToken) {
  if (!data || !botToken) return false;

  const { hash, ...fields } = data;
  if (!hash) return false;

  // Build data-check-string
  const dataCheckString = Object.keys(fields)
    .filter((key) => fields[key] !== undefined && fields[key] !== null && fields[key] !== '')
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join('\n');

  // Key = SHA256(botToken)
  const secretKey = crypto.createHash('sha256').update(botToken).digest();

  // HMAC-SHA256
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (hmac !== hash) return false;

  // Check auth_date is within 24 hours
  const authDate = parseInt(data.auth_date, 10);
  if (isNaN(authDate)) return false;

  const now = Math.floor(Date.now() / 1000);
  const maxAge = 24 * 60 * 60; // 86400 seconds

  if (now - authDate > maxAge) return false;

  return true;
}

module.exports = { verifyTelegramAuth };
