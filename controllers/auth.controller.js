const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const { ApiError } = require('../middleware/error.middleware');

/**
 * Login user and return JWT token
 * @route POST /api/auth/login
 * @access Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Check if email and password are provided
    if (!email || !password) {
      throw new ApiError(400, 'Please provide an email and password');
    }
    
    // Find user by email and include password field
    const user = await User.findOne({ email }).select('+password');
    
    // Check if user exists
    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }
    
    // Check if password matches
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      throw new ApiError(401, 'Invalid credentials');
    }
    
    // Check if user is active
    if (!user.isActive) {
      throw new ApiError(401, 'Your account has been deactivated');
    }
    
    // Update last login timestamp
    user.lastLogin = Date.now();
    await user.save();
    
    // Generate JWT token
    const token = generateToken(user._id, user.role);
    
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
const register = async (req, res, next) => {
  try {
    const {
      email,
      firstName,
      lastName,
      password,
      phone
    } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }
    
    // Create user
    const user = new User({
      email,
      firstName,
      lastName,
      password,
      phone,
      role: 'customer' // Default role for registration
    });
    
    await user.save();
    
    // Generate JWT token
    const token = generateToken(user._id, user.role);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 * @route GET /api/auth/me
 * @access Private
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to generate JWT token
 */
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'your-default-jwt-secret',
    { expiresIn: '30d' }
  );
};

/**
 * Google OAuth callback handler
 * @route GET /api/auth/google/callback
 * @access Public
 */
const googleCallback = (req, res) => {
  // Generate JWT token
  const token = generateToken(req.user._id, req.user.role);
  
  // Redirect to frontend with token
  // In production, you would redirect to your frontend URL with the token
  const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${redirectUrl}/login?token=${token}`);
};

module.exports = {
  login,
  register,
  getCurrentUser,
  googleCallback
};