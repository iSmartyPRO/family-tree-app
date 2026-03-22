'use strict';

const express = require('express');
const { requireAdmin } = require('../middleware/admin');
const { requireAuth } = require('../middleware/auth');
const SystemConfig = require('../models/SystemConfig');
const User = require('../models/User');

const router = express.Router();

// All admin routes require auth + admin role
router.use(requireAuth, requireAdmin);

// GET /api/admin/config
router.get('/config', async (req, res, next) => {
  try {
    const cfg = await SystemConfig.get();
    res.json(cfg.toJSON());
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/config
router.put('/config', async (req, res, next) => {
  try {
    const {
      appName,
      logoUrl,
      baseUrl,
      primaryColor,
      customCss,
      smtp,
      telegramBotToken,
      telegramBotName,
      whatsappEnabled,
    } = req.body;

    const updateData = {};
    if (appName !== undefined) updateData.appName = appName;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (customCss !== undefined) updateData.customCss = customCss;
    if (smtp !== undefined) updateData.smtp = smtp;
    if (telegramBotToken !== undefined) updateData.telegramBotToken = telegramBotToken;
    if (telegramBotName !== undefined) updateData.telegramBotName = telegramBotName;
    if (whatsappEnabled !== undefined) updateData.whatsappEnabled = whatsappEnabled;

    const updated = await SystemConfig.set(updateData);
    res.json(updated.toJSON());
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users
router.get('/users', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(),
    ]);

    res.json({
      users: users.map((u) => u.toJSON()),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', async (req, res, next) => {
  try {
    const { isAdmin, name } = req.body;
    const updateData = {};
    if (isAdmin !== undefined) updateData.isAdmin = Boolean(isAdmin);
    if (name !== undefined) updateData.name = name.trim();

    const user = await User.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
    }

    res.json(user.toJSON());
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
