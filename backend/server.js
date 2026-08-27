import './config/env.js';
import express from 'express';
import cors from 'cors';
import dashboardRoutes from './routes/dashboard.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { sequelize } from './models/index.js';

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
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ChangeDesk Backend API', env: NODE_ENV });
});

// Mount modular routes
app.use('/api/dashboard', dashboardRoutes);

// 404 + centralized error handling (order matters — these come last)
app.use(notFoundHandler);
app.use(errorHandler);

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('[ChangeDesk Backend] Database connection established');
    // Create any missing tables without touching existing data.
    // Use `npm run db:sync` / `db:sync:force` for seeding or a full rebuild.
    if (process.env.DB_SYNC === 'true') {
      await sequelize.sync();
      console.log('[ChangeDesk Backend] sequelize.sync() complete');
    }
  } catch (err) {
    console.error('[ChangeDesk Backend] Database connection FAILED:', err.message);
    console.error('  → API will still start, but DB-backed routes will return 500 until it is reachable.');
  }

  app.listen(PORT, () => {
    console.log(`[ChangeDesk Backend] Server running at http://localhost:${PORT} (env: ${NODE_ENV})`);
  });
};

start();
