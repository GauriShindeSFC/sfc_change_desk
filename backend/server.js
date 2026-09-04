import './config/env.js';
import express from 'express';
import cors from 'cors';
import dashboardRoutes from './routes/dashboard.js';
import authRoutes from './routes/auth.js';
import { requireAuth } from './middlewares/auth.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { Op } from 'sequelize';
import { sequelize, Role, User, ChangeManagerCategory } from './models/index.js';
import { roles } from './data/seed.js';
import { verifyMailTransport } from './services/mailService.js';
import { initScheduler } from './services/schedulerService.js';

const app = express();
const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS: comma-separated allow-list from env, or open if unset / "*"
const rawOrigin = (process.env.CORS_ORIGIN || '').trim();
const corsOptions =
  !rawOrigin || rawOrigin === '*'
    ? {}
    : { origin: rawOrigin.split(',').map((o) => o.trim()).filter(Boolean) };

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ChangeDesk Backend API', env: NODE_ENV });
});

// Mount modular routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes); // every dashboard route needs a session

// 404 + centralized error handling (order matters — these come last)
app.use(notFoundHandler);
app.use(errorHandler);

const syncRolesInDb = async () => {
  try {
    // Delete any old/deprecated roles not matching our 4 active roles
    const validRoleIds = roles.map((r) => r.id);
    await Role.destroy({ where: { id: { [Op.notIn]: validRoleIds } } }).catch(() => {});

    for (const r of roles) {
      await Role.upsert(r).catch(() => {});
    }

    // Remap any orphaned users missing a roleId to role-4 (Requester - least privileged)
    await User.update({ roleId: 'role-4' }, { where: { roleId: null } }).catch(() => {});

    // Ensure default category assignments exist for Change Managers if empty
    const cmCatCount = await ChangeManagerCategory.count().catch(() => 0);
    if (cmCatCount === 0) {
      const defaultAssignments = [
        { id: 'cmc-usr-1-cat-srv', userId: 'usr-1', categoryId: 'cat-srv' },
        { id: 'cmc-usr-1-cat-net', userId: 'usr-1', categoryId: 'cat-net' },
        { id: 'cmc-usr-1-cat-acc', userId: 'usr-1', categoryId: 'cat-acc' },
        { id: 'cmc-usr-1-cat-asset', userId: 'usr-1', categoryId: 'cat-asset' }
      ];
      for (const item of defaultAssignments) {
        await ChangeManagerCategory.upsert(item).catch(() => {});
      }
    }
    console.log('[ChangeDesk Backend] Synced 4 system roles and category assignments in database');
  } catch (syncErr) {
    console.warn('[ChangeDesk Backend] Role/Category sync notice:', syncErr.message);
  }
};

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('[ChangeDesk Backend] Database connection established');
    if (process.env.DB_SYNC === 'true') {
      await sequelize.sync();
    }
  } catch (err) {
    console.error('[ChangeDesk Backend] Database connection FAILED:', err.message);
    console.error('  → API will still start, but DB-backed routes will return 500 until it is reachable.');
  }

  await verifyMailTransport();
  initScheduler();

  app.listen(PORT, () => {
    console.log(`[ChangeDesk Backend] Server running at http://localhost:${PORT} (env: ${NODE_ENV})`);
  });
};

start();
