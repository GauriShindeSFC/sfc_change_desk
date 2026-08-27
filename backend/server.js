import express from 'express';
import cors from 'cors';
import dashboardRoutes from './routes/dashboard.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ChangeDesk Backend API' });
});

// Mount Modular Routes
app.use('/api/dashboard', dashboardRoutes);

// Error Handling Middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[ChangeDesk Backend] Server running at http://localhost:${PORT}`);
});
