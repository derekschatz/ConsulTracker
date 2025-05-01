require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for development/testing
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Origin: ${req.headers.origin || 'unknown'}`);
  next();
});

// Import routes
const checkoutRoutes = require('./routes/api/create-checkout-session');
const verifySessionRoutes = require('./routes/api/verify-session');

// Register routes
app.use('/api/create-checkout-session', checkoutRoutes);
app.use('/api', verifySessionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for all origins (development mode)`);
});

module.exports = app; 