const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
// express-mongo-sanitize removed due to Express 5 compatibility issues
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

// Load env vars
dotenv.config();

const app = express();

// Set security HTTP headers
app.use(helmet());

// Rate limiting: 1000 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});
app.use('/api/', limiter);

// Middleware
app.use(express.json({ limit: '10kb' })); // Prevent DOS by limiting body payload
app.use(cookieParser());

// Enable CORS with credentials for specific frontend origin
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://tyreshop-client.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }, 
  credentials: true
}));

// Sanitize data against NoSQL Injection (Express 5 safe)
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return;
  for (const key in obj) {
    if (key.startsWith('$')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      sanitizeObject(obj[key]);
    }
  }
};
app.use((req, res, next) => {
  ['body', 'params', 'query'].forEach(k => {
    if (req[k]) sanitizeObject(req[k]);
  });
  next();
});

// Sanitize data against XSS (React handles XSS automatically on the frontend)
// app.use(xss()); removed due to Express 5 compatibility

// Connect to DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/services', require('./routes/services'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
