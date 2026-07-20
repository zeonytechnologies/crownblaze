const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_dev_only');
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token.' });
  }
};

const scannerAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
    }

    // Check if it's the fixed scanner key
    if (authHeader.startsWith('Scanner ')) {
      const key = authHeader.split(' ')[1];
      if (key === 'Crownbeatz_scan_2026') {
        req.admin = { username: 'scanner_agent' };
        return next();
      } else {
        return res.status(401).json({ success: false, error: 'Invalid Scanner Key.' });
      }
    }
    
    // Otherwise, try normal admin JWT
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_dev_only');
      req.admin = decoded;
      return next();
    }

    return res.status(401).json({ success: false, error: 'Invalid Authorization format.' });
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token.' });
  }
};

module.exports = { adminAuth, scannerAuth };
