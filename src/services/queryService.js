const db = require('../db/pool');

/**
 * Query Service
 * Handles complex analytical queries against the events table.
 */
const queryService = {
  /**
   * Get full journey for a trackingId
   */
  async getJourney(trackingId) {
    const query = `
      SELECT event_type, source, timestamp, metadata
      FROM events
      WHERE tracking_id = $1
      ORDER BY timestamp ASC
    `;
    
    const result = await db.query(query, [trackingId]);
    const events = result.rows;
    
    if (events.length === 0) return null;
    
    // Calculate precise duration and chronological timeline
    let totalDuration = 0;
    const pageBreakdown = {}; // For aggregate stats
    const timeline = []; // For chronological sequence

    events.forEach(e => {
      const duration = parseInt(e.metadata?.duration || 0);
      const url = e.metadata?.url || 'unknown';

      // 1. Accumulate total and per-page duration
      if (duration > 0) {
        totalDuration += duration;
        if (!pageBreakdown[url]) {
          pageBreakdown[url] = { url, timeSpent: 0, views: 0 };
        }
        pageBreakdown[url].timeSpent += duration;

        // 2. Accumulate into the active timeline entry (last page)
        if (timeline.length > 0) {
          timeline[timeline.length - 1].duration += duration;
        }
      }

      // 3. New Timeline Entry on Page View
      if (e.event_type === 'PAGE_VIEW') {
        if (!pageBreakdown[url]) {
          pageBreakdown[url] = { url, timeSpent: 0, views: 0 };
        }
        pageBreakdown[url].views += 1;

        // Add to chronological timeline (with server-side deduplication)
        const lastEntry = timeline[timeline.length - 1];
        if (lastEntry && lastEntry.url === url && (e.timestamp - lastEntry.enteredAt < 2000)) {
          // If it's the same URL within 2 seconds, treat it as the same "visit"
          // We don't push a new entry, effectively deduplicating
          return;
        }

        timeline.push({
          url,
          enteredAt: e.timestamp,
          duration: 0
        });
      }
    });
    
    return {
      trackingId,
      events,
      summary: {
        totalEvents: events.length,
        firstSeen: events[0].timestamp,
        lastSeen: events[events.length - 1].timestamp,
        timeSpentSeconds: totalDuration,
        timeline,
        pagesVisited: Object.values(pageBreakdown)
      }
    };
  },

  /**
   * Get link analytics for a trackingId
   */
  async getLinkAnalytics(trackingId) {
    const query = `
      SELECT timestamp, metadata->>'url' as target_url
      FROM events
      WHERE tracking_id = $1 AND event_type = 'LINK_CLICK'
      ORDER BY timestamp DESC
    `;
    
    const result = await db.query(query, [trackingId]);
    const clicks = result.rows;

    return {
      trackingId,
      clickCount: clicks.length,
      clicks: clicks
    };
  },

  /**
   * Get page-level analytics
   */
  async getPageAnalytics(url) {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE event_type = 'PAGE_VIEW') as views,
        COUNT(DISTINCT tracking_id) as unique_visitors,
        SUM((metadata->>'duration')::int) as total_duration
      FROM events
      WHERE metadata->>'url' LIKE $1
    `;
    
    const result = await db.query(query, [`%${url}%`]);
    const stats = result.rows[0];

    return {
      url,
      pageViews: parseInt(stats.views),
      uniqueVisitors: parseInt(stats.unique_visitors),
      avgTimeSpentSeconds: Math.round((parseInt(stats.total_duration || 0)) / (parseInt(stats.unique_visitors) || 1))
    };
  },
  /**
   * Get email-specific analytics for a trackingId
   */
  async getEmailAnalytics(trackingId) {
    const query = `
      SELECT timestamp
      FROM events
      WHERE tracking_id = $1 AND event_type = 'EMAIL_OPEN'
      ORDER BY timestamp ASC
    `;
    
    const result = await db.query(query, [trackingId]);
    const opens = result.rows;

    if (opens.length === 0) {
      return {
        trackingId,
        isOpened: false,
        openCount: 0
      };
    }

    return {
      trackingId,
      isOpened: true,
      openCount: opens.length,
      firstOpened: opens[0].timestamp,
      lastOpened: opens[opens.length - 1].timestamp
    };
  }
};

module.exports = queryService;
