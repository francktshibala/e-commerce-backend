require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const userRoutes = require('./routes/user.routes');
const orderRoutes = require('./routes/order.routes');
const categoryRoutes = require('./routes/category.routes');
const reviewRoutes = require('./routes/review.routes');

// Import middleware
const { notFound, errorHandler } = require('./middleware/error.middleware');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
require('./config/db.config');

// Configure passport
require('./config/passport.config');

// Rate limiting - Parse from environment variables if available
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:"],
    },
  },
})); 

// CORS configuration - updated to be more flexible for development and production
const allowedOrigins = [
  process.env.FRONTEND_URL, 
  'https://e-commerce-backend-md2g.onrender.com',
  process.env.RENDER_EXTERNAL_URL,
  // Add any additional origins you need to whitelist
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (process.env.NODE_ENV === 'production') {
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      }
    } else {
      // In development, allow all origins
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Handle CORS errors
app.use((err, req, res, next) => {
  if (err.message.includes('CORS')) {
    res.status(403).json({
      error: 'CORS Error',
      message: err.message,
      allowedOrigins
    });
  } else {
    next(err);
  }
});

app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use('/api', apiLimiter); // Apply rate limiting to all API routes

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reviews', reviewRoutes);

// Dynamic Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "E-Commerce API",
      description: "API documentation for the e-commerce backend with OAuth 2.0 authentication",
      version: "1.0.0",
      contact: {
        name: "Franck Tshibala",
        url: "https://github.com/francktshibala/e-commerce-backend"
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT"
      }
    },
    servers: [
      {
        // Dynamically determine the server URL based on environment
        url: process.env.NODE_ENV === 'production' 
          ? (process.env.API_URL || 'https://e-commerce-backend-md2g.onrender.com')
          : 'http://localhost:5000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    tags: [
      { name: "Authentication", description: "Authentication operations" },
      { name: "Products", description: "Product management" },
      { name: "Categories", description: "Category management" },
      { name: "Orders", description: "Order management" },
      { name: "Reviews", description: "Product review management" },
      { name: "Users", description: "User management (Admin only)" }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        },
        googleOAuth: {
          type: "oauth2",
          flows: {
            authorizationCode: {
              authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
              tokenUrl: "https://oauth2.googleapis.com/token",
              scopes: {
                "profile": "User's basic profile",
                "email": "User's email address"
              }
            }
          }
        }
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            message: { type: "string" },
            stack: { type: "string" }
          }
        }
      }
    }
  },
  apis: ['./routes/*.routes.js'] // Path to the API docs
};

// Try to load Swagger from file first, fall back to generated version if not available
let swaggerDocument;
try {
  swaggerDocument = JSON.parse(fs.readFileSync('./swagger.json', 'utf8'));
  
  // Update server URLs dynamically even if loading from file
  if (swaggerDocument.servers && Array.isArray(swaggerDocument.servers)) {
    swaggerDocument.servers = [
      {
        url: process.env.NODE_ENV === 'production' 
          ? (process.env.API_URL || 'https://e-commerce-backend-md2g.onrender.com')
          : 'http://localhost:5000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ];
  }
  
  console.log('Loaded Swagger configuration from file');
} catch (error) {
  console.log('Generating Swagger documentation dynamically');
  swaggerDocument = swaggerJsdoc(swaggerOptions);
}

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }', // Hide the default Swagger UI top bar
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none', // Initially collapsed
    filter: true // Add search filter
  }
}));

// Enhanced health check endpoint
app.get('/health', (req, res) => {
  // Check MongoDB connection
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: mongoStatus,
      host: mongoose.connection.host || 'unknown'
    },
    uptime: process.uptime() + ' seconds'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Welcome to the E-commerce API',
    documentation: '/api-docs',
    health: '/health',
    version: '1.0.0',
    author: 'Franck Tshibala'
  });
});

// Error middleware should be last
app.use(notFound);  // Handle 404 errors for unmatched routes
app.use(errorHandler);  // Handle all errors

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// For testing purposes
module.exports = app;