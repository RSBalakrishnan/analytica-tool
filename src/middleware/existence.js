const eventService = require('../services/eventService');

/**
 * Existence Middleware
 * Verifies that the trackingId exists in the registration registry.
 * Should be used AFTER format validation.
 */
const checkExistence = async (req, res, next) => {
  const trackingId = req.params.trackingId || req.query.trackingId || req.body.trackingId;

  if (!trackingId) {
    return next(); // Let format validation or route handler handle missing ID
  }

  try {
    const isRegistered = await eventService.isTrackingIdRegistered(trackingId);
    if (!isRegistered) {
      return res.status(404).json({
        error: 'ID Not Registered',
        message: 'The provided tracking ID was not found in our system.'
      });
    }
    next();
  } catch (err) {
    console.error('Existence check failed:', err);
    // In case of DB error, we might want to fail open or closed.
    // For analytics, failing closed (error) is safer.
    res.status(500).json({ error: 'Internal validation error', message: err.message });
  }
};

module.exports = checkExistence;
