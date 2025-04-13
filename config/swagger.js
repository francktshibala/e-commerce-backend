const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-Commerce API',
      version: '1.0.0',
      description: 'API documentation for the e-commerce backend',
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? process.env.API_URL || 'https://your-render-url.onrender.com'
          : 'http://localhost:5000',
        description: process.env.NODE_ENV === 'production' ? 'Production Server' : 'Development Server',
      },
    ],
  },
  apis: ['./routes/*.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

module.exports = {
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(specs),
};