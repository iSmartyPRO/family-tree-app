'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const { connect } = require('./db');

const authRouter = require('./routes/auth');
const treesRouter = require('./routes/trees');
const adminRouter = require('./routes/admin');
const publicRouter = require('./routes/public');

async function start() {
  // Connect to MongoDB before starting the server
  await connect();

  const app = express();

  // CORS
  app.use(
    cors({
      origin: config.appUrl,
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Cookie parser
  app.use(cookieParser());

  // Rate limiting: 100 requests per 15 minutes per IP
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'RATE_LIMIT', message: 'Too many requests, please try again later.' },
  });
  app.use(limiter);

  // API routes
  app.use('/api/auth', authRouter);
  app.use('/api/trees', treesRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/public', publicRouter);

  // Static files (production build)
  const distPath = path.resolve(__dirname, '../../dist');
  app.use(express.static(distPath));

  // SPA fallback for non-API routes
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Page not found' });
      }
    });
  });

  // Global error handler
  app.use((err, req, res, _next) => {
    console.error('[error]', err);

    const status = err.status || err.statusCode || 500;
    const message =
      process.env.NODE_ENV === 'production' && status === 500
        ? 'Internal server error'
        : err.message || 'Internal server error';

    res.status(status).json({
      error: err.code || 'INTERNAL_ERROR',
      message,
    });
  });

  const port = config.port;
  app.listen(port, () => {
    console.log(`[server] ${config.appName} backend running on port ${port}`);
    console.log(`[server] App URL: ${config.appUrl}`);
  });

  return app;
}

start().catch((err) => {
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});
