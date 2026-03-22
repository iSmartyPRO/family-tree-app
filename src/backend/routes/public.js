'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const Tree = require('../models/Tree');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Helper: sanitize tree for public view (only name, nodes, relations)
function sanitizeTree(tree) {
  return {
    id: tree._id.toString(),
    name: tree.name,
    nodes: tree.nodes,
    relations: tree.relations,
    createdAt: tree.createdAt,
    updatedAt: tree.updatedAt,
  };
}

// GET /api/public/:token
router.get('/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const tree = await Tree.findOne({
      'publicLink.token': token,
      'publicLink.active': true,
    });

    if (!tree) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Public link not found or inactive' });
    }

    // Check expiry
    if (tree.publicLink.expiresAt && tree.publicLink.expiresAt < new Date()) {
      return res.status(410).json({ error: 'LINK_EXPIRED', message: 'This link has expired' });
    }

    // Check password if set
    if (tree.publicLink.passwordHash) {
      const providedPassword = req.headers['x-link-password'] || '';
      if (!providedPassword) {
        return res.status(401).json({ error: 'PASSWORD_REQUIRED', message: 'This link is password protected' });
      }

      const passwordOk = await bcrypt.compare(providedPassword, tree.publicLink.passwordHash);
      if (!passwordOk) {
        return res.status(401).json({ error: 'WRONG_PASSWORD', message: 'Incorrect password' });
      }
    }

    res.json(sanitizeTree(tree));
  } catch (err) {
    next(err);
  }
});

// POST /api/public/:token/clone
router.post('/:token/clone', requireAuth, async (req, res, next) => {
  try {
    const { token } = req.params;

    const sourceTree = await Tree.findOne({
      'publicLink.token': token,
      'publicLink.active': true,
    });

    if (!sourceTree) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Public link not found or inactive' });
    }

    // Check expiry
    if (sourceTree.publicLink.expiresAt && sourceTree.publicLink.expiresAt < new Date()) {
      return res.status(410).json({ error: 'LINK_EXPIRED', message: 'This link has expired' });
    }

    // Check password if set
    if (sourceTree.publicLink.passwordHash) {
      const providedPassword = req.headers['x-link-password'] || '';
      if (!providedPassword) {
        return res.status(401).json({ error: 'PASSWORD_REQUIRED', message: 'This link is password protected' });
      }

      const passwordOk = await bcrypt.compare(providedPassword, sourceTree.publicLink.passwordHash);
      if (!passwordOk) {
        return res.status(401).json({ error: 'WRONG_PASSWORD', message: 'Incorrect password' });
      }
    }

    // Clone the tree
    const clonedTree = await Tree.create({
      name: `${sourceTree.name} (copy)`,
      owner: req.user.id,
      nodes: sourceTree.nodes,
      relations: sourceTree.relations,
      members: [],
      publicLink: null,
    });

    await clonedTree.populate('owner', 'name email');
    res.status(201).json(clonedTree.toJSON());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
