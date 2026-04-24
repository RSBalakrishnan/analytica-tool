/**
 * Authentication Middleware
 * Checks for a valid API key in the x-api-key header.
 */
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    console.error('API_KEY environment variable is not set');
    return res.status(500).json({ error: 'Internal Server Error', message: 'Authentication is misconfigured' });
  }

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing API key' });
  }

  next();
};

module.exports = authenticate;
