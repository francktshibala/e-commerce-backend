const jwt = require('jsonwebtoken');
const { ApiError } = require('./error.middleware');
const User = require('../models/user.model');

/**
 * Parse authorization header if present
 * This middleware doesn't return an error if no token is provided,
 * useful for endpoints that work with or without authentication
 */
const parseAuthToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extract token
      const token = authHeader.split(' ')[1];
      
      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-default-jwt-secret'
      );
      
      // Add user info to request
      req.user = {
        id: decoded.id,
        role: decoded.role
      };
    }
    
    // Continue regardless of token presence
    next();
  } catch (error) {
    // Continue without error even if token is invalid
    next();
  }
};

/**
 * Protect routes - require valid authentication
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Not authorized, no token provided');
    }
    
    try {
      // Extract token
      const token = authHeader.split(' ')[1];
      
      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-default-jwt-secret'
      );
      
      // Find user
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        throw new ApiError(401, 'User not found');
      }
      
      if (!user.isActive) {
        throw new ApiError(401, 'User account is deactivated');
      }
      
      // Add user info to request
      req.user = {
        id: user._id.toString(),
        email: user.email,
        role: user.role
      };
      
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new ApiError(401, 'Invalid token');
      } else if (error.name === 'TokenExpiredError') {
        throw new ApiError(401, 'Token expired');
      } else {
        throw error;
      }
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Restrict access to specific roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, 'You do not have permission to perform this action')
      );
    }
    next();
  };
};

/**
 * Check if user is the owner or an admin
 */
const isOwnerOrAdmin = (paramIdField) => {
  return (req, res, next) => {
    const resourceId = req.params[paramIdField];
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Admin can access any resource
    if (userRole === 'admin') {
      return next();
    }
    
    // For user resources, check if user is the owner
    if (resourceId === userId) {
      return next();
    }
    
    // If neither admin nor owner, deny access
    return next(
      new ApiError(403, 'You do not have permission to access this resource')
    );
  };
};

module.exports = {
  parseAuthToken,
  protect,
  restrictTo,
  isOwnerOrAdmin
};