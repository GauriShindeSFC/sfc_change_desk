import './config/env.js';
import express from 'express';
import cors from 'cors';
import dashboardRoutes from './routes/dashboard.routes.js';
import authRoutes from './routes/auth.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { sequelize, Role } from './models/index.js';
import { roles } from './data/seed.js';
import { verifyMailTransport } from './services/mail.service.js';
import { startNotificationWorker } from './services/notificationQueue.service.js';

import publicActionRoutes from './routes/publicAction.routes.js';

const app = express();
const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

const allowedOrigins = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const allowAllOrigins = allowedOrigins.includes('*');

app.use(cors({
  origin: (origin, callback) => {
    // Same-origin requests, curl, health checks, etc. send no Origin header — allow those through.
    if (!origin || allowAllOrigins || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin "${origin}" is not allowed by CORS policy`));
  }
}));
// Vendor quotation / travel document attachments are sent as base64 JSON, not multipart —
// keep enough headroom for a few-MB PDF (base64 inflates size ~33%) while still well short of the old 50mb ceiling.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Liveness: process is up and serving HTTP, regardless of DB state.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ChangeDesk Backend API', env: NODE_ENV });
});

// Readiness: only "ok" once the database is actually reachable — a deploy should not
// be marked healthy while every data-backed route would just return 500s.
app.get('/api/health/ready', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', service: 'ChangeDesk Backend API', env: NODE_ENV, database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'unavailable', service: 'ChangeDesk Backend API', env: NODE_ENV, database: 'unreachable' });
  }
});

// Mount modular routes
app.use('/api/auth', authRoutes);
app.use('/api/public', publicActionRoutes);
app.use('/api/dashboard', dashboardRoutes); // Authenticated via authenticateUser inside dashboard.js

// 404 + centralized error handling (order matters — these come last)
app.use(notFoundHandler);
app.use(errorHandler);

const syncRolesInDb = async () => {
  try {
    // Additive-only: a routine deploy should never delete role rows a prior migration or
    // admin action created. Removing an obsolete role is a deliberate, reviewed migration,
    // not something a web server's startup path should do on every boot.
    for (const r of roles) {
      await Role.upsert(r).catch(() => {});
    }
  } catch (syncErr) {
    console.warn('[ChangeDesk Backend] Role sync notice:', syncErr.message);
  }
};

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('[ChangeDesk Backend] Database connection established');
    if (process.env.DB_SYNC === 'true') {
      await sequelize.sync();
    }
    await syncRolesInDb();
    // Reset or ensure unified global request sequence starts from 1
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'global_request_code_seq') THEN
          CREATE SEQUENCE global_request_code_seq START WITH 1;
        ELSE
          PERFORM setval('global_request_code_seq', 1, false);
        END IF;
      END $$;
    `).catch((err) => console.warn('[Sequence] Sequence init notice:', err.message));
  } catch (err) {
    console.error('[ChangeDesk Backend] Database connection FAILED:', err.message);
    console.error('  → API will still start, but DB-backed routes will return 500 until it is reachable.');
  }

  await verifyMailTransport();
  startNotificationWorker(15000);

  app.listen(PORT, () => {
    console.log(`[ChangeDesk Backend] Server running at http://localhost:${PORT} (env: ${NODE_ENV})`);
  });
};

start();
