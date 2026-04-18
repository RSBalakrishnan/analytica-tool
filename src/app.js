const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const enrichRequest = require('./middleware/enrichment');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();

// Swagger Definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Analytica Infrastructure API',
      version: '1.0.0',
      description: 'Developer-first analytics infrastructure for event tracking, identity propagation, and querying.',
    },
    servers: [
      {
        url: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Basic Middleware
const allowedOrigins = process.env.CORS_ALLOW_ORIGINS || '*';
app.use(cors({
  origin: allowedOrigins === '*' ? '*' : allowedOrigins.split(','),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(enrichRequest);

// Serve JS SDK as a static asset
app.use('/sdk', express.static(path.join(__dirname, '../sdk')));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Import Routes
const trackingRoutes = require('./routes/tracking');
const eventRoutes = require('./routes/events');
const analyticsRoutes = require('./routes/analytics');

app.use('/track', trackingRoutes);
app.use('/', trackingRoutes); // For /pixel and /r shortcuts
app.use('/events', eventRoutes);
app.use('/analytics', analyticsRoutes);

// Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Analytica System A running on port ${PORT}`);
});

module.exports = app;
