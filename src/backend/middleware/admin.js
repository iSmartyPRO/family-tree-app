'use strict';

const { requireAuth } = require('./auth');

function requireAdmin(req, res, next) {
  // First ensure the user is authenticated
  requireAuth(req, res, (err) => {
    if (err) return next(err);

    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Admin access required' });
    }

    next();
  });
}

module.exports = { requireAdmin };
