const { Pool } = require('pg');
require('dotenv').config();

/**
 * DB Pool with Smart Mock Mode support.
 * If DATABASE_URL is missing or MOCK_DB=true is set, it returns a mock interface
 * that stores events in-memory, allowing for immediate testing of analytics.
 */

let pool;
let isMock = process.env.MOCK_DB === 'true' || !process.env.DATABASE_URL;

if (isMock) {
  console.log('⚠️  [Analytica] Database URL not found or MOCK_DB is true. Running in SMART MOCK MODE.');
  
  const mockStore = [];

  pool = {
    query: async (text, params) => {
      // Normalize whitespace and case for matching
      const sql = text.replace(/\s+/g, ' ').trim().toUpperCase();
      
      // Handle INSERT
      if (sql.startsWith('INSERT INTO EVENTS')) {
        const event = {
          event_id: Math.floor(Math.random() * 1000000), // Simulate ID
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

      // Handle SELECT JOURNEY / EMAIL STATUS
      if (sql.includes('FROM EVENTS WHERE TRACKING_ID = $1')) {
        const trackingId = params[0];
        let rows = mockStore
          .filter(e => e.tracking_id === trackingId)
          .sort((a, b) => a.timestamp - b.timestamp);
        
        // Specific check for email open status query
        if (sql.includes('EVENT_TYPE = \'EMAIL_OPEN\'')) {
          rows = rows.filter(e => e.event_type === 'EMAIL_OPEN');
        }

        return { rows, rowCount: rows.length };
      }

      // Handle PAGE ANALYTICS (Aggregations)
      if (sql.includes('SELECT COUNT(*)') && sql.includes('LIKE $1')) {
        const urlMatch = params[0].replace(/%/g, '');
        const filtered = mockStore.filter(e => JSON.stringify(e.metadata).includes(urlMatch));
        
        return {
          rows: [{
            views: filtered.filter(e => e.event_type === 'PAGE_VIEW').length,
            unique_visitors: new Set(filtered.map(e => e.tracking_id)).size,
            total_duration: filtered.reduce((acc, e) => acc + (parseInt(e.metadata.duration) || 0), 0)
          }],
          rowCount: 1
        };
      }

      // Handle PAGE DETAILS (Granular lists)
      if (sql.includes('SELECT TRACKING_ID') && sql.includes('LIKE $1')) {
        const urlMatch = params[0].replace(/%/g, '');
        const rows = mockStore
          .filter(e => JSON.stringify(e.metadata).includes(urlMatch))
          .sort((a, b) => {
            const urlA = a.metadata?.url || '';
            const urlB = b.metadata?.url || '';
            if (urlA < urlB) return -1;
            if (urlA > urlB) return 1;
            if (a.tracking_id < b.tracking_id) return -1;
            if (a.tracking_id > b.tracking_id) return 1;
            return a.timestamp - b.timestamp;
          });
        
        return { rows, rowCount: rows.length };
      }

      // Handle Transactions
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) {
        return { rows: [], rowCount: 0 };
      }

      console.log(`[MOCK UNHANDLED]: ${text}`);
      return { rows: [], rowCount: 0 };
    },
    connect: async () => {
      return {
        query: async (text, params) => pool.query(text, params),
        release: () => {}
      };
    },
    on: () => {}
  };
} else {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: process.env.DB_MAX_CONNECTIONS ? parseInt(process.env.DB_MAX_CONNECTIONS) : (process.env.LAMBDA_TASK_ROOT ? 2 : 20),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
  });
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  isMock
};
