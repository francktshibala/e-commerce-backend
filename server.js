require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const rateLimit = require('express-rate-limit');

// Import routes
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');

// Import middleware
const { notFound, errorHandler } = require('./middleware/error.middleware');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
require('./config/db.config');

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// Middleware
app.use(helmet()); // Set security-related HTTP headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter); // Apply rate limiting to all API routes

// Routes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);

// Load Swagger JSON file
let swaggerDocument;
try {
  swaggerDocument = JSON.parse(fs.readFileSync('./swagger.json', 'utf8'));
} catch (error) {
  console.error('Error loading swagger.json file:', error);
  // Fallback to a basic Swagger document if file not found
  swaggerDocument = {
    openapi: "3.0.3",
    info: {
      title: "E-Commerce Backend",
      description: "API documentation for the e-commerce backend with product and category management",
      version: "1.0.0"
    },
    servers: [
      {
        url: "http://localhost:5000/api",
        description: "Local server"
      }
    ]
  };
}

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Welcome to the E-commerce Backend',
    documentation: '/api-docs'
  });
});

// Error middleware should be last
app.use(notFound);  // Handle 404 errors for unmatched routes
app.use(errorHandler);  // Handle all errors

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// For testing purposes
module.exports = app;