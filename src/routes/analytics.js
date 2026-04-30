const express = require('express');
const Joi = require('joi');
const queryService = require('../services/queryService');
const validate = require('../middleware/validation');
const checkExistence = require('../middleware/existence');

const router = express.Router();

// Common Schemas
const trackingIdSchema = Joi.object({
  trackingId: Joi.string().regex(/^[A-Za-z0-9_-]{21}$/).required().messages({
    'string.pattern.base': 'trackingId must be a valid 21-character alphanumeric string (including _ and -)'
  })
});

const urlSchema = Joi.object({
  url: Joi.string().uri().required()
});

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
 * GET /analytics/tracking/:trackingId
 * Returns the full user journey and summary stats.
 */
router.get('/tracking/:trackingId', validate({ params: trackingIdSchema }), checkExistence, async (req, res) => {
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
 * GET /analytics/link/:trackingId
 * Returns link clicks for a specific ID.
 */
router.get('/link/:trackingId', validate({ params: trackingIdSchema }), checkExistence, async (req, res) => {
  try {
    const data = await queryService.getLinkAnalytics(req.params.trackingId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Query failed', message: err.message });
  }
});

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
 * GET /analytics/page
 * Returns aggregate stats for a specific page URL.
 */
router.get('/page', validate({ query: urlSchema }), async (req, res) => {
  try {
    const stats = await queryService.getPageAnalytics(req.query.url);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Query failed', message: err.message });
  }
});

/**
 * @openapi
 * /analytics/page/details:
 *   get:
 *     summary: Get Detailed Page Analytics (Separated by trackingId)
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
 *         description: Granular list of visitors and their events for this page
 */
/**
 * GET /analytics/page/details
 * Returns granular events separated by trackingId for a specific URL.
 */
router.get('/page/details', validate({ query: urlSchema }), async (req, res) => {
  try {
    const data = await queryService.getPageDetails(req.query.url);
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
 * GET /analytics/email/:trackingId
 * Returns email-specific stats (opens).
 */
router.get('/email/:trackingId', validate({ params: trackingIdSchema }), checkExistence, async (req, res) => {
  try {
    const data = await queryService.getEmailAnalytics(req.params.trackingId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Query failed', message: err.message });
  }
});

module.exports = router;
