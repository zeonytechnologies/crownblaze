const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://checkout.razorpay.com", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https://*.supabase.co"],
      connectSrc: ["'self'", "https://api.razorpay.com", "https://*.supabase.co"],
      frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"]
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

app.listen(PORT, () => {
  console.log(`CrownBeatz server running on http://localhost:${PORT}`);
});

module.exports = app; // For Vercel serverless deployment
