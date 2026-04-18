const express = require('express');
const queryService = require('../services/queryService');

const router = express.Router();

/**
 * @openapi
 * /analytics/tracking/{trackingId}:
 *   get:
 *     summary: Get Full User Journey
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: trackingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Full chronological event journey
 */
/**
 * @openapi
 * /analytics/link/{trackingId}:
 *   get:
 *     summary: Get Link Analytics
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: trackingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Link click performance for this ID
 */
/**
 * @openapi
 * /analytics/page:
 *   get:
 *     summary: Get Page Analytics
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: The page URL to analyze
 *     responses:
 *       200:
 *         description: Aggregate stats for the specified page
 */
/**
 * GET /analytics/tracking/:trackingId
 * Returns the full user journey and summary stats.
 */
router.get('/tracking/:trackingId', async (req, res) => {
  try {
    const journey = await queryService.getJourney(req.params.trackingId);
    if (!journey) {
      return res.status(404).json({ error: 'No data found for this tracking ID' });
    }
    res.json(journey);
  } catch (err) {
    res.status(500).json({ error: 'Query failed', message: err.message });
  }
});

/**
 * GET /analytics/link/:trackingId
 * Returns link clicks for a specific ID.
 */
router.get('/link/:trackingId', async (req, res) => {
  try {
    const data = await queryService.getLinkAnalytics(req.params.trackingId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Query failed', message: err.message });
  }
});

/**
 * @openapi
 * /analytics/email/{trackingId}:
 *   get:
 *     summary: Get Email Open Status
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: trackingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email open status and count
 */
/**
 * GET /analytics/page
 * Returns aggregate stats for a specific page URL.
 */
router.get('/page', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const stats = await queryService.getPageAnalytics(url);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Query failed', message: err.message });
  }
});

/**
 * GET /analytics/email/:trackingId
 * Returns email-specific stats (opens).
 */
router.get('/email/:trackingId', async (req, res) => {
  try {
    const data = await queryService.getEmailAnalytics(req.params.trackingId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Query failed', message: err.message });
  }
});

module.exports = router;
