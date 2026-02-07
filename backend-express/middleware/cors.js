const cors = require('cors');

// Development origins
const devOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://172.18.4.161:3000', // WSL IP
];

// Production origins from environment variable
const prodOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [];

// Combine all allowed origins
const allowedOrigins = [...devOrigins, ...prodOrigins];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('⚠️ CORS blocked origin:', origin);
      // In production, block unknown origins. In development, allow all.
      if (process.env.NODE_ENV === 'production') {
        callback(null, false);
      } else {
        callback(null, true);
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Headers',
    'Access-Control-Request-Method',
    'X-Site-Id',
  ],
  exposedHeaders: ['Content-Length', 'X-Total-Count'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

module.exports = cors(corsOptions);