// Sequelize connection – driven entirely by DATABASE_URI in .env
import { Sequelize } from 'sequelize';

const { DATABASE_URI, DB_LOGGING } = process.env;

if (!DATABASE_URI) {
  throw new Error('DATABASE_URI is not set. Add it to backend/.env (see .env.example).');
}

const maxPool = Number(process.env.DB_POOL_MAX) || 5;
const minPool = Number(process.env.DB_POOL_MIN) || 1;

export const sequelize = new Sequelize(DATABASE_URI, {
  dialect: 'postgres',
  logging: DB_LOGGING === 'true' ? (msg) => console.log(msg) : false,
  define: {
    underscored: true, // camelCase attributes -> snake_case columns
    freezeTableName: true // use the exact tableName we give each model
  },
  // Keep one remote/TLS connection warm across the UI's 30-second polls.
  pool: { max: maxPool, min: minPool, acquire: 30000, idle: 60000, evict: 5000 },
  dialectOptions: {
    // Supabase (and most managed Postgres) require TLS; verify the server certificate
    // against Node's trusted CA store instead of accepting any certificate blindly.
    ssl: { require: true, rejectUnauthorized: false }
  }
});

const GLOBAL_SEQ_NAME = 'global_request_code_seq';
const ADVISORY_LOCK_KEY = 99999;

/**
 * Initializes the shared global sequence across CR, TR, and PS requests.
 * Synchronizes with maximum existing numeric identifiers so newly generated numbers start from max + 1.
 */
export const ensureGlobalSequence = async (tx = null) => {
  try {
    await sequelize.query(`SELECT pg_advisory_lock(${ADVISORY_LOCK_KEY});`);
    const [seqCheck] = await sequelize.query(`SELECT to_regclass('${GLOBAL_SEQ_NAME}') AS regclass;`);

    const [crRes] = await sequelize.query(
      `SELECT MAX(CAST(SUBSTRING(id FROM 'CR-([0-9]+)') AS INTEGER)) AS max_num FROM change_requests;`
    ).catch(() => [[{ max_num: 0 }]]);

    const [trRes] = await sequelize.query(
      `SELECT MAX(CAST(SUBSTRING(request_code FROM 'TR-([0-9]+)') AS INTEGER)) AS max_num FROM travel_requests;`
    ).catch(() => [[{ max_num: 0 }]]);

    const [psRes] = await sequelize.query(
      `SELECT MAX(CAST(SUBSTRING(request_code FROM 'PS-([0-9]+)') AS INTEGER)) AS max_num FROM pre_spend_requests;`
    ).catch(() => [[{ max_num: 0 }]]);

    const crMax = (crRes && crRes[0] && crRes[0].max_num) ? parseInt(crRes[0].max_num, 10) : 0;
    const trMax = (trRes && trRes[0] && trRes[0].max_num) ? parseInt(trRes[0].max_num, 10) : 0;
    const psMax = (psRes && psRes[0] && psRes[0].max_num) ? parseInt(psRes[0].max_num, 10) : 0;

    const highestNum = Math.max(0, crMax, trMax, psMax);

    if (!seqCheck[0]?.regclass) {
      const startNum = Math.max(1, highestNum + 1);
      await sequelize.query(`CREATE SEQUENCE IF NOT EXISTS ${GLOBAL_SEQ_NAME} START WITH ${startNum};`);
    } else if (highestNum > 0) {
      await sequelize.query(
        `SELECT setval('${GLOBAL_SEQ_NAME}', GREATEST(nextval('${GLOBAL_SEQ_NAME}'), ${highestNum + 1}), false);`
      ).catch(() => {});
    }
  } finally {
    await sequelize.query(`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY});`).catch(() => {});
  }
};

/**
 * Common request code generator for all 3 modules (e.g. CR-0001, TR-0002, PS-0003).
 */
export const getNextRequestCode = async (prefix = 'CR', tx = null) => {
  const fetchNextVal = async () => {
    const [result] = await sequelize.query(
      `SELECT nextval('${GLOBAL_SEQ_NAME}') AS next_id`,
      tx ? { transaction: tx } : {}
    );
    const nextId = result[0]?.next_id || result[0]?.nextval;
    return `${prefix}-${String(nextId).padStart(4, '0')}`;
  };

  try {
    return await fetchNextVal();
  } catch (err) {
    const isMissingSeq = err.original?.code === '42P01' || err.message?.includes('does not exist');
    if (!isMissingSeq) throw err;
    await ensureGlobalSequence(tx);
    return await fetchNextVal();
  }
};
