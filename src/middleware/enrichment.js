/**
 * Enrichment Middleware
 * Captures IP and User-Agent from the request and attaches them to the body or query
 * for unified event logging.
 */
const enrichRequest = (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];
  
  // Attach to request object for use in route handlers
  req.analyticsMetadata = {
    ip,
    userAgent,
    timestamp: Date.now()
  };
  
  next();
};

module.exports = enrichRequest;
