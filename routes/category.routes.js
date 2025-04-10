const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { categoryValidators, commonValidators } = require('../middleware/validation.middleware');

// Get all categories
router.get('/', categoryController.getCategories);

// Get a single category by ID or slug
router.get('/:idOrSlug', categoryController.getCategory);

// Get products by category
router.get('/:idOrSlug/products', commonValidators.pagination, commonValidators.sorting, categoryController.getCategoryProducts);

// Create a new category (protected - admin only)
router.post(
  '/',
  protect,
  restrictTo('admin'),
  categoryValidators.createCategory,
  categoryController.createCategory
);

// Update a category (protected - admin only)
router.put(
  '/:id',
  protect,
  restrictTo('admin'),
  categoryValidators.categoryId,
  categoryValidators.createCategory,
  categoryController.updateCategory
);

// Delete a category (protected - admin only)
router.delete(
  '/:id',
  protect,
  restrictTo('admin'),
  categoryValidators.categoryId,
  categoryController.deleteCategory
);

module.exports = router;