const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { categoryValidators, commonValidators } = require('../middleware/validation.middleware');

// Get all categories
router.get('/', categoryController.getCategories);

// Get a single category by ID or slug
router.get('/:idOrSlug', categoryController.getCategory);

// Get products by category
router.get('/:idOrSlug/products', commonValidators.pagination, commonValidators.sorting, categoryController.getCategoryProducts);

// Create a new category
router.post('/', categoryValidators.createCategory, categoryController.createCategory);

// Update a category
router.put('/:id', categoryValidators.categoryId, categoryController.updateCategory);

// Delete a category
router.delete('/:id', categoryValidators.categoryId, categoryController.deleteCategory);

module.exports = router;