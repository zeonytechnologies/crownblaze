const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const https = require('https');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1); // Required for secure URLs on platforms like Render
const PORT = process.env.PORT || 3000;

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https://*.supabase.co"],
      connectSrc: ["'self'", "https://*.supabase.co"],
      frameSrc: ["'self'"]
    }
  }
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting to prevent brute-force attacks
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { success: false, error: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Import Route Handlers
const paymentRoutes = require('./routes/payment');
const adminRoutes = require('./routes/admin');
const ticketRoutes = require('./routes/ticket');

// Map Routes
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ticket', ticketRoutes);

// Page Routings
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin/scanner', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'scanner.html'));
});

// Fallback for Vercel/SPA routing and index mapping
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// --- Anti-Sleep Mechanism for Render Free Tier ---
// Create a simple ping route
app.get('/api/ping', (req, res) => res.status(200).send('pong'));

// Start the 14-minute interval if running on Render
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_EXTERNAL_URL) {
  setInterval(() => {
    https.get(`${RENDER_EXTERNAL_URL}/api/ping`, (res) => {
      console.log(`[Anti-Sleep] Pinged self. Status: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error(`[Anti-Sleep] Ping failed: ${err.message}`);
    });
  }, 14 * 60 * 1000); // 14 minutes
}
// --------------------------------------------------

app.listen(PORT, () => {
  console.log(`CrownBeatz server running on http://localhost:${PORT}`);
});

module.exports = app; // For Vercel serverless deployment
