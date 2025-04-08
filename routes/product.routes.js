const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { parseAuthToken } = require('../middleware/auth.middleware');
const { productValidators, commonValidators } = require('../middleware/validation.middleware');

// Get all products
router.get('/', commonValidators.pagination, commonValidators.sorting, productController.getProducts);

// Get a product by ID or slug
router.get('/:idOrSlug', parseAuthToken, productController.getProduct);

// Create a new product
router.post('/', productValidators.createProduct, productController.createProduct);

// Update a product
router.put('/:id', productValidators.productId, productController.updateProduct);

// Delete a product
router.delete('/:id', productValidators.productId, productController.deleteProduct);

module.exports = router;