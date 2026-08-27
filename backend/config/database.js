// Sequelize connection – driven entirely by DATABASE_URI in .env
import { Sequelize } from 'sequelize';

const { DATABASE_URI, DB_LOGGING } = process.env;

if (!DATABASE_URI) {
  throw new Error('DATABASE_URI is not set. Add it to backend/.env (see .env.example).');
}

export const sequelize = new Sequelize(DATABASE_URI, {
  dialect: 'postgres',
  logging: DB_LOGGING === 'true' ? (msg) => console.log(msg) : false,
  define: {
    underscored: true, // camelCase attributes -> snake_case columns
    freezeTableName: true // use the exact tableName we give each model
  },
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
  dialectOptions: {
    // Supabase (and most managed Postgres) require TLS
    ssl: { require: true, rejectUnauthorized: false }
  }
});
