const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const { userValidators } = require('../middleware/validation.middleware');
const { protect } = require('../middleware/auth.middleware');

// Initialize passport
require('../config/passport.config');

// Login user
router.post(
  '/login',
  userValidators.login,
  authController.login
);

// Register new user
router.post(
  '/register',
  userValidators.register,
  authController.register
);

// Get current user profile
router.get(
  '/me',
  protect,
  authController.getCurrentUser
);

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  authController.googleCallback
);

module.exports = router;