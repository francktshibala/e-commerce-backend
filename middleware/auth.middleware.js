/**
 * Parse authorization header if present
 * This middleware doesn't return an error if no token is provided,
 * useful for endpoints that work with or without authentication
 */
const parseAuthToken = (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // This is just a basic implementation for now
        // In a real app, you would verify the token here
        const token = authHeader.split(' ')[1];
        
        // We're not validating tokens for this simplified version
        // Just making the middleware available
        next();
      } else {
        // No token provided, continue
        next();
      }
    } catch (error) {
      // Error parsing token, continue without error
      next();
    }
  };
  
  module.exports = {
    parseAuthToken
  };