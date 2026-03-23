'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');
const { sendVerificationEmail } = require('../utils/email');
const { verifyTelegramAuth } = require('../utils/telegram');

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    {
      id: user.id || user._id.toString(),
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function setCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'email, password and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'EMAIL_TAKEN', message: 'Email already in use' });
    }

    const passwordHash = await User.hashPassword(password);
    const emailVerifyToken = uuidv4();

    const user = await User.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name.trim(),
      emailVerifyToken,
    });

    // Send verification email if SMTP is configured
    if (config.smtp.host) {
      try {
        await sendVerificationEmail(user, emailVerifyToken, config.appUrl);
      } catch (emailErr) {
        console.warn('[auth] Failed to send verification email:', emailErr.message);
      }
    } else {
      console.log(`[auth] Email verification token for ${user.email}: ${emailVerifyToken}`);
    }

    const token = createToken(user);
    setCookie(res, token);

    res.status(201).json(user.toJSON());
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    const token = createToken(user);
    setCookie(res, token);

    res.json(user.toJSON());
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
    }
    res.json(user.toJSON());
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/me — обновление preferences (тема, язык и т.д.) в MongoDB
router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
    }

    const { preferences } = req.body;
    if (preferences && typeof preferences === 'object') {
      user.preferences = { ...(user.preferences || {}), ...preferences };
      if (user.preferences.theme != null && user.preferences.theme !== 'dark' && user.preferences.theme !== 'light') {
        delete user.preferences.theme;
      }
      if (user.preferences.lang != null && typeof user.preferences.lang === 'string') {
        user.preferences.lang = user.preferences.lang.slice(0, 8);
      }
    }

    await user.save();
    res.json(user.toJSON());
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/verify-email/:token
router.get('/verify-email/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ emailVerifyToken: token });
    if (!user) {
      return res.status(400).json({ error: 'INVALID_TOKEN', message: 'Invalid or expired verification token' });
    }

    user.emailVerified = true;
    user.emailVerifyToken = undefined;
    await user.save();

    res.json({ ok: true, message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/telegram
router.post('/telegram', async (req, res, next) => {
  try {
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = req.body;

    if (!config.telegram.botToken) {
      return res.status(503).json({ error: 'SERVICE_UNAVAILABLE', message: 'Telegram auth not configured' });
    }

    if (!id || !hash || !auth_date) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Missing required Telegram fields' });
    }

    const authData = { id, first_name, last_name, username, photo_url, auth_date, hash };
    const isValid = verifyTelegramAuth(authData, config.telegram.botToken);

    if (!isValid) {
      return res.status(401).json({ error: 'INVALID_TELEGRAM_AUTH', message: 'Telegram authentication failed' });
    }

    const telegramId = String(id);

    // Try to find user by telegramId first, then by email if available
    let user = await User.findOne({ telegramId });

    if (!user) {
      // Try to find by username-based email or create new
      const name = [first_name, last_name].filter(Boolean).join(' ') || username || `tg_${telegramId}`;
      const email = `telegram_${telegramId}@telegram.local`;

      user = await User.findOneAndUpdate(
        { telegramId },
        {
          $setOnInsert: {
            email,
            name,
            telegramId,
            emailVerified: true,
          },
        },
        { upsert: true, new: true }
      );
    }

    const token = createToken(user);
    setCookie(res, token);

    res.json(user.toJSON());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
