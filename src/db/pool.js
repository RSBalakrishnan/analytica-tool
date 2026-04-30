const { Pool } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
require('dotenv').config();

let pool;
let isMock = process.env.MOCK_DB === 'true' || (!process.env.DATABASE_URL && !process.env.DB_SECRET_ARN);

async function getConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  
  if (process.env.DB_SECRET_ARN) {
    const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'ap-south-1' });
    try {
      const response = await client.send(new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN }));
      const secret = JSON.parse(response.SecretString);
      return `postgresql://${secret.username}:${secret.password}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`;
    } catch (err) {
      console.error('Error fetching secret:', err);
      throw err;
    }
  }
  return null;
}

const mockStore = [];
const mockRegistry = [];
const mockPool = {
  query: async (text, params) => {
    const sql = text.replace(/\s+/g, ' ').trim().toUpperCase();
    
    // 1. Ingestion (Events)
    if (sql.startsWith('INSERT INTO EVENTS')) {
      const event = {
        event_id: Math.floor(Math.random() * 1000000),
        tracking_id: params[0],
        user_id: params[1],
        session_id: params[2],
        event_type: params[3],
        source: params[4],
        timestamp: params[5],
        metadata: params[6] ? JSON.parse(params[6]) : {}
      };
      mockStore.push(event);
      return { rows: [event], rowCount: 1 };
    }

    // 2. Registry Registration
    if (sql.startsWith('INSERT INTO TRACKING_REGISTRY')) {
      if (!mockRegistry.includes(params[0])) {
        mockRegistry.push(params[0]);
      }
      return { rows: [], rowCount: 1 };
    }

    // 3. Registry Check
    if (sql.includes('FROM TRACKING_REGISTRY WHERE TRACKING_ID = $1')) {
      const trackingId = params[0];
      const exists = mockRegistry.includes(trackingId);
      return { rows: exists ? [{1: 1}] : [], rowCount: exists ? 1 : 0 };
    }

    // 4. Analytics Queries
    if (sql.includes('FROM EVENTS WHERE TRACKING_ID = $1')) {
      const trackingId = params[0];
      let rows = mockStore.filter(e => e.tracking_id === trackingId).sort((a, b) => a.timestamp - b.timestamp);
      if (sql.includes("EVENT_TYPE = 'EMAIL_OPEN'")) rows = rows.filter(e => e.event_type === 'EMAIL_OPEN');
      return { rows, rowCount: rows.length };
    }

    return { rows: [], rowCount: 0 };
  },
  connect: async () => ({ query: async (t, p) => mockPool.query(t, p), release: () => {} }),
  on: () => {}
};

async function initialize() {
  if (pool) return pool;

  if (isMock) {
    console.log('⚠️ Running in SMART MOCK MODE');
    pool = mockPool;
    return pool;
  }

  const connectionString = await getConnectionString();
  pool = new Pool({
    connectionString,
    max: process.env.DB_MAX_CONNECTIONS ? parseInt(process.env.DB_MAX_CONNECTIONS) : (process.env.LAMBDA_TASK_ROOT ? 2 : 20),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false
  });

  pool.on('error', (err) => console.error('Unexpected error on idle client', err));
  return pool;
}

module.exports = {
  initialize,
  query: async (text, params) => {
    if (!pool) await initialize();
    return pool.query(text, params);
  },
  connect: async () => {
    if (!pool) await initialize();
    return pool.connect();
  },
  get pool() { return pool; },
  isMock
};
