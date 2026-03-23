'use strict';

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Tree = require('../models/Tree');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { exportToGedcom, importFromGedcom } = require('../utils/gedcom');

const router = express.Router();

// All tree routes require authentication
router.use(requireAuth);

// Multer: memory storage for file imports
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// Helper: check if user has any access to tree (owner or member)
function hasReadAccess(tree, userId) {
  if (tree.owner._id ? tree.owner._id.toString() === userId : tree.owner.toString() === userId) {
    return true;
  }
  return tree.members.some((m) => m.user.toString() === userId);
}

// Helper: check if user has write access (owner or editor)
function hasWriteAccess(tree, userId) {
  if (tree.owner._id ? tree.owner._id.toString() === userId : tree.owner.toString() === userId) {
    return true;
  }
  return tree.members.some((m) => m.user.toString() === userId && m.role === 'editor');
}

// Helper: check if user is owner
function isOwner(tree, userId) {
  const ownerId = tree.owner._id ? tree.owner._id.toString() : tree.owner.toString();
  return ownerId === userId;
}

// GET /api/trees
router.get('/', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const trees = await Tree.find({
      $or: [{ owner: userId }, { 'members.user': userId }],
    }).populate('owner', 'name email');

    res.json(trees.map((t) => t.toJSON()));
  } catch (err) {
    next(err);
  }
});

// POST /api/trees
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'name is required' });
    }

    const tree = await Tree.create({
      name: name.trim(),
      owner: req.user.id,
    });

    await tree.populate('owner', 'name email');
    res.status(201).json(tree.toJSON());
  } catch (err) {
    next(err);
  }
});

// GET /api/trees/:id
router.get('/:id', async (req, res, next) => {
  try {
    const tree = await Tree.findById(req.params.id).populate('owner', 'name email');
    if (!tree) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Tree not found' });
    }

    if (!hasReadAccess(tree, req.user.id)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied' });
    }

    res.json(tree.toJSON());
  } catch (err) {
    next(err);
  }
});

// PUT /api/trees/:id
router.put('/:id', async (req, res, next) => {
  try {
    const tree = await Tree.findById(req.params.id).populate('owner', 'name email');
    if (!tree) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Tree not found' });
    }

    if (!hasWriteAccess(tree, req.user.id)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Write access denied' });
    }

    const { name, nodes, relations, viewSettings } = req.body;
    if (name !== undefined) tree.name = name.trim();
    if (nodes !== undefined) tree.nodes = nodes;
    if (relations !== undefined) tree.relations = relations;
    if (viewSettings !== undefined) tree.viewSettings = viewSettings;

    await tree.save();
    res.json(tree.toJSON());
  } catch (err) {
    next(err);
  }
});

// DELETE /api/trees/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const tree = await Tree.findById(req.params.id);
    if (!tree) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Tree not found' });
    }

    if (!isOwner(tree, req.user.id)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Only the owner can delete this tree' });
    }

    await Tree.deleteOne({ _id: tree._id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/trees/:id/share
router.post('/:id/share', async (req, res, next) => {
  try {
    const tree = await Tree.findById(req.params.id).populate('owner', 'name email');
    if (!tree) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Tree not found' });
    }

    if (!isOwner(tree, req.user.id)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Only the owner can manage sharing' });
    }

    const { email, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'email and role are required' });
    }

    if (!['viewer', 'editor'].includes(role)) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'role must be viewer or editor' });
    }

    const targetUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (!targetUser) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User with that email not found' });
    }

    if (isOwner(tree, targetUser.id)) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Cannot share with the owner' });
    }

    const existingIdx = tree.members.findIndex((m) => m.user.toString() === targetUser.id);
    if (existingIdx >= 0) {
      tree.members[existingIdx].role = role;
    } else {
      tree.members.push({ user: targetUser._id, role, addedAt: new Date() });
    }

    await tree.save();
    res.json(tree.toJSON());
  } catch (err) {
    next(err);
  }
});

// DELETE /api/trees/:id/share/:userId
router.delete('/:id/share/:userId', async (req, res, next) => {
  try {
    const tree = await Tree.findById(req.params.id).populate('owner', 'name email');
    if (!tree) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Tree not found' });
    }

    if (!isOwner(tree, req.user.id)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Only the owner can manage sharing' });
    }

    const before = tree.members.length;
    tree.members = tree.members.filter((m) => m.user.toString() !== req.params.userId);

    if (tree.members.length === before) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Member not found' });
    }

    await tree.save();
    res.json(tree.toJSON());
  } catch (err) {
    next(err);
  }
});

// POST /api/trees/:id/public-link
router.post('/:id/public-link', async (req, res, next) => {
  try {
    const tree = await Tree.findById(req.params.id).populate('owner', 'name email');
    if (!tree) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Tree not found' });
    }

    if (!isOwner(tree, req.user.id)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Only the owner can manage public links' });
    }

    const { password, ttlDays } = req.body;

    const token = uuidv4();
    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    let expiresAt = null;
    if (ttlDays && Number(ttlDays) > 0) {
      expiresAt = new Date(Date.now() + Number(ttlDays) * 24 * 60 * 60 * 1000);
    }

    tree.publicLink = { token, passwordHash, expiresAt, active: true };
    await tree.save();

    res.json(tree.toJSON());
  } catch (err) {
    next(err);
  }
});

// DELETE /api/trees/:id/public-link
router.delete('/:id/public-link', async (req, res, next) => {
  try {
    const tree = await Tree.findById(req.params.id).populate('owner', 'name email');
    if (!tree) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Tree not found' });
    }

    if (!isOwner(tree, req.user.id)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Only the owner can manage public links' });
    }

    tree.publicLink = null;
    await tree.save();

    res.json(tree.toJSON());
  } catch (err) {
    next(err);
  }
});

// GET /api/trees/:id/export
router.get('/:id/export', async (req, res, next) => {
  try {
    const tree = await Tree.findById(req.params.id).populate('owner', 'name email');
    if (!tree) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Tree not found' });
    }

    if (!hasReadAccess(tree, req.user.id)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied' });
    }

    const format = req.query.format || 'json';

    if (format === 'json') {
      res.setHeader('Content-Disposition', `attachment; filename="${tree.name}.json"`);
      res.json(tree.toJSON());
    } else if (format === 'gedcom') {
      const gedcomStr = exportToGedcom(tree);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${tree.name}.ged"`);
      res.send(gedcomStr);
    } else {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'format must be json or gedcom' });
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/trees/:id/import
router.post('/:id/import', upload.single('file'), async (req, res, next) => {
  try {
    const tree = await Tree.findById(req.params.id).populate('owner', 'name email');
    if (!tree) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Tree not found' });
    }

    if (!hasWriteAccess(tree, req.user.id)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Write access denied' });
    }

    let importedNodes = [];
    let importedRelations = [];

    if (req.file) {
      // File upload: parse JSON or GEDCOM
      const content = req.file.buffer.toString('utf8');
      const filename = req.file.originalname || '';

      if (filename.endsWith('.ged') || filename.endsWith('.gedcom')) {
        const parsed = importFromGedcom(content);
        importedNodes = parsed.nodes;
        importedRelations = parsed.relations;
      } else {
        // Assume JSON
        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch {
          return res.status(400).json({ error: 'PARSE_ERROR', message: 'Invalid JSON file' });
        }
        importedNodes = parsed.nodes || [];
        importedRelations = parsed.relations || [];
      }
    } else if (req.body.url) {
      // Clone by URL: fetch another public tree
      const url = req.body.url;
      const http = url.startsWith('https') ? require('https') : require('http');

      const fetchData = () =>
        new Promise((resolve, reject) => {
          http
            .get(url, (response) => {
              let data = '';
              response.on('data', (chunk) => (data += chunk));
              response.on('end', () => {
                try {
                  resolve(JSON.parse(data));
                } catch {
                  reject(new Error('Failed to parse response from URL'));
                }
              });
            })
            .on('error', reject);
        });

      const remoteData = await fetchData();
      importedNodes = remoteData.nodes || [];
      importedRelations = remoteData.relations || [];
    } else {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Provide file or url' });
    }

    // Merge: append imported nodes/relations
    tree.nodes = [...tree.nodes, ...importedNodes];
    tree.relations = [...tree.relations, ...importedRelations];
    await tree.save();

    res.json(tree.toJSON());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
