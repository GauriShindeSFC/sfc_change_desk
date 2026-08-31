// Sequelize connection – driven entirely by DATABASE_URI in .env
import { Sequelize } from 'sequelize';

const { DATABASE_URI, DB_LOGGING } = process.env;

if (!DATABASE_URI) {
  throw new Error('DATABASE_URI is not set. Add it to backend/.env (see .env.example).');
}

const maxPool = Number(process.env.DB_POOL_MAX) || 25;
const minPool = Number(process.env.DB_POOL_MIN) || 5;

export const sequelize = new Sequelize(DATABASE_URI, {
  dialect: 'postgres',
  logging: DB_LOGGING === 'true' ? (msg) => console.log(msg) : false,
  define: {
    underscored: true, // camelCase attributes -> snake_case columns
    freezeTableName: true // use the exact tableName we give each model
  },
  pool: { max: maxPool, min: minPool, acquire: 60000, idle: 10000 },
  dialectOptions: {
    // Supabase (and most managed Postgres) require TLS
    ssl: { require: true, rejectUnauthorized: false }
  }
});
