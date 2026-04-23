const express = require('express');
const { nanoid } = require('nanoid');
const eventService = require('../services/eventService');

const router = express.Router();

/**
 * @openapi
 * /track/id:
 *   post:
 *     summary: Generate a new Tracking ID
 *     tags: [Identity]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targets:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["https://mysite.com/docs", "https://mysite.com/pricing"]
 *     responses:
 *       200:
 *         description: Successfully generated tracking ID with full URLs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 trackingId:
 *                   type: string
 *                   example: V1StGXR8_Z5jdHi6B-myT
 *                 pixelUrl:
 *                   type: string
 *                   example: http://localhost:3000/pixel/V1StGXR8_Z5jdHi6B-myT
 *                 redirectUrlBase:
 *                   type: string
 *                   example: http://localhost:3000/r/V1StGXR8_Z5jdHi6B-myT?url=
 *                 links:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       original:
 *                         type: string
 *                       tracking:
 *                         type: string
 */
/**
 * @openapi
 * /pixel/{trackingId}:
 *   get:
 *     summary: Email Open Tracking Pixel
 *     tags: [Tracking]
 *     parameters:
 *       - in: path
 *         name: trackingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transparent 1x1 GIF
 *         content:
 *           image/gif:
 *             schema:
 *               type: string
 *               format: binary
 */
/**
 * @openapi
 * /r/{trackingId}:
 *   get:
 *     summary: Link Redirect Tracking
 *     tags: [Tracking]
 *     parameters:
 *       - in: path
 *         name: trackingId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: The target URL to redirect to
 *     responses:
 *       302:
 *         description: Redirects to target URL with tid propagation
 */
// Transparent 1x1 GIF tracking pixel
const PIXEL_BIN = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

/**
 * POST /track/id
 * Generates a new tracking ID for a requester along with ready-to-use URLs.
 * Supports an optional 'targets' array for bulk link generation.
 */
router.post('/id', (req, res) => {
  const { targets } = req.body || {};
  const trackingId = nanoid(21);
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  
  const response = { 
    trackingId,
    pixelUrl: `${baseUrl}/pixel/${trackingId}`,
    redirectUrlBase: `${baseUrl}/r/${trackingId}?url=`
  };

  // Bulk Dynamic Link Generation
  if (Array.isArray(targets) && targets.length > 0) {
    response.links = targets.map(target => ({
      original: target,
      tracking: `${baseUrl}/r/${trackingId}?url=${encodeURIComponent(target)}`
    }));
  }
  
  res.json(response);
});

/**
 * GET /pixel/:trackingId
 * Invisible pixel for email open tracking.
 */
router.get('/pixel/:trackingId', async (req, res) => {
  const { trackingId } = req.params;
  const { ip, userAgent, timestamp } = req.analyticsMetadata;

  try {
    // Fire and forget (optional: await if you need strict consistency)
    eventService.logEvent({
      trackingId,
      sessionId: 'system', // No browser session for email pixels
      eventType: 'EMAIL_OPEN',
      source: 'EMAIL',
      timestamp,
      metadata: { ip, userAgent }
    });
  } catch (err) {
    console.error('Pixel log failed:', err);
  }

  res.set({
    'Content-Type': 'image/gif',
    'Content-Length': PIXEL_BIN.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  res.status(200).send(PIXEL_BIN);
});

/**
 * GET /r/:trackingId
 * Link redirect tracking.
 */
router.get('/r/:trackingId', async (req, res) => {
  const { trackingId } = req.params;
  const { url } = req.query;
  const { ip, userAgent, timestamp } = req.analyticsMetadata;

  if (!url) {
    return res.status(400).json({ error: 'Missing redirect url parameter' });
  }

  try {
    await eventService.logEvent({
      trackingId,
      sessionId: 'system', // System session for first click
      eventType: 'LINK_CLICK',
      source: 'LINK',
      timestamp,
      metadata: { url, ip, userAgent }
    });
  } catch (err) {
    console.error('Redirect log failed:', err);
  }

  // Propagation: Append tid to the target URL
  const targetUrl = new URL(url);
  targetUrl.searchParams.set('tid', trackingId);

  res.redirect(targetUrl.toString());
});

module.exports = router;
