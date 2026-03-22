'use strict';

const mongoose = require('mongoose');
const config = require('./config');

async function connect() {
  try {
    await mongoose.connect(config.mongoUrl, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('[db] Connected to MongoDB:', config.mongoUrl);
  } catch (err) {
    console.error('[db] MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('[db] MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('[db] MongoDB error:', err.message);
});

module.exports = { connect, mongoose };
