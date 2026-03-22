'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

function extractToken(req) {
  return req.cookies && req.cookies.token ? req.cookies.token : null;
}

function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      isAdmin: payload.isAdmin || false,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }
}

function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      isAdmin: payload.isAdmin || false,
    };
  } catch {
    req.user = null;
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
