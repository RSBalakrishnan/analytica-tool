const express = require('express');
const eventService = require('../services/eventService');

const router = express.Router();

/**
 * @openapi
 * /events:
 *   post:
 *     summary: Ingest a batch of events
 *     tags: [Ingestion]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [trackingId, sessionId, events]
 *             properties:
 *               trackingId:
 *                 type: string
 *               sessionId:
 *                 type: string
 *               userId:
 *                 type: string
 *               events:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [eventType]
 *                   properties:
 *                     eventType:
 *                       type: string
 *                       enum: [PAGE_VIEW, HEARTBEAT, EMAIL_OPEN, LINK_CLICK]
 *                     timestamp:
 *                       type: integer
 *                     metadata:
 *                       type: object
 *     responses:
 *       200:
 *         description: Successfully ingested events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ingested:
 *                   type: integer
 */
/**
 * POST /events
 * Main ingestion endpoint for website tracking.
 * Accepts a batch of events with trackingId and sessionId.
 */
router.post('/', async (req, res) => {
  const { trackingId, sessionId, userId, events } = req.body;
  const { ip, userAgent } = req.analyticsMetadata;

  // Validation
  if (!trackingId || !sessionId) {
    return res.status(400).json({ error: 'trackingId and sessionId are mandatory' });
  }

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'events must be a non-empty array' });
  }

  try {
    // Enrich each event with server-side metadata if not present
    const enrichedEvents = events.map(event => ({
      ...event,
      source: 'WEBSITE',
      metadata: {
        ...event.metadata,
        ip,
        userAgent
      }
    }));

    const count = await eventService.logEvents(trackingId, sessionId, userId, enrichedEvents);
    res.status(200).json({ ingested: count });
  } catch (err) {
    console.error('Batch ingestion failed:', err);
    res.status(500).json({ error: 'Failed to ingest events', details: err.message });
  }
});

module.exports = router;
