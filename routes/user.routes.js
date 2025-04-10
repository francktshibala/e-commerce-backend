const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect, restrictTo, isOwnerOrAdmin } = require('../middleware/auth.middleware');
const { userValidators, commonValidators } = require('../middleware/validation.middleware');

// Get all users (admin only)
router.get(
  '/',
  protect,
  restrictTo('admin'),
  commonValidators.pagination,
  commonValidators.sorting,
  userController.getUsers
);

// Get user profile (authenticated user)
router.get(
  '/profile',
  protect,
  userController.getUserProfile
);

// Update user profile (authenticated user)
router.put(
  '/profile',
  protect,
  userController.updateUserProfile
);

// Get a specific user (admin or own user)
router.get(
  '/:id',
  protect,
  isOwnerOrAdmin('id'),
  userController.getUser
);

// Create a new user (admin only)
router.post(
  '/',
  protect,
  restrictTo('admin'),
  userValidators.createUser,
  userController.createUser
);

// Update a user (admin or own user)
router.put(
  '/:id',
  protect,
  isOwnerOrAdmin('id'),
  userValidators.userId,
  userController.updateUser
);

// Delete a user (admin or own user)
router.delete(
  '/:id',
  protect,
  isOwnerOrAdmin('id'),
  userValidators.userId,
  userController.deleteUser
);

// Add address to user
router.post(
  '/:id/addresses',
  protect,
  isOwnerOrAdmin('id'),
  userValidators.userId,
  userValidators.address,
  userController.addUserAddress
);

// Remove address from user
router.delete(
  '/:userId/addresses/:addressId',
  protect,
  isOwnerOrAdmin('userId'),
  userController.removeUserAddress
);

module.exports = router;