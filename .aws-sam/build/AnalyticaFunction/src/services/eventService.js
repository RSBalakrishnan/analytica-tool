const db = require('../db/pool');

/**
 * Event Service
 * Handles persistence of tracking events to PostgreSQL.
 */
const eventService = {
  /**
   * Log a single event
   */
  async logEvent({ trackingId, userId = null, sessionId, eventType, source, metadata = {}, timestamp = Date.now() }) {
    const query = `
      INSERT INTO events (tracking_id, user_id, session_id, event_type, source, timestamp, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING event_id
    `;
    
    const values = [
      trackingId,
      userId,
      sessionId,
      eventType,
      source,
      timestamp,
      JSON.stringify(metadata)
    ];
    
    try {
      const result = await db.query(query, values);
      return result.rows[0].event_id;
    } catch (err) {
      console.error('Error logging event:', err);
      throw err;
    }
  },

  /**
   * Log a batch of events
   */
  async logEvents(trackingId, sessionId, userId, events) {
    // Using a transaction for batch ingestion
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      const insertQuery = `
        INSERT INTO events (tracking_id, user_id, session_id, event_type, source, timestamp, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      for (const event of events) {
        const values = [
          trackingId,
          userId,
          sessionId,
          event.eventType,
          event.source || 'WEBSITE',
          event.timestamp || Date.now(),
          JSON.stringify(event.metadata || {})
        ];
        await client.query(insertQuery, values);
      }
      
      await client.query('COMMIT');
      return events.length;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error logging batch events:', err);
      throw err;
    } finally {
      client.release();
    }
  }
};

module.exports = eventService;
