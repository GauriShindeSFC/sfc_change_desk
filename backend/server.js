import './config/env.js';
import express from 'express';
import cors from 'cors';
import dashboardRoutes from './routes/dashboard.routes.js';
import authRoutes from './routes/auth.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { Op } from 'sequelize';
import { sequelize, Role } from './models/index.js';
import { roles } from './data/seed.js';
import { verifyMailTransport } from './services/mail.service.js';

import publicActionRoutes from './routes/publicAction.routes.js';

const app = express();
const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ChangeDesk Backend API', env: NODE_ENV });
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
    const validRoleIds = roles.map((r) => r.id);
    await Role.destroy({ where: { id: { [Op.notIn]: validRoleIds } } }).catch(() => {});

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
  } catch (err) {
    console.error('[ChangeDesk Backend] Database connection FAILED:', err.message);
    console.error('  → API will still start, but DB-backed routes will return 500 until it is reachable.');
  }

  await verifyMailTransport();

  app.listen(PORT, () => {
    console.log(`[ChangeDesk Backend] Server running at http://localhost:${PORT} (env: ${NODE_ENV})`);
  });
};

start();
