const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { productValidators, commonValidators } = require('../middleware/validation.middleware');

// Get all products
router.get('/', commonValidators.pagination, commonValidators.sorting, productController.getProducts);

// Get a product by ID or slug
router.get('/:idOrSlug', productController.getProduct);

// Create a new product (protected - admin only)
router.post(
  '/',
  protect,
  restrictTo('admin'),
  productValidators.createProduct,
  productController.createProduct
);

// Update a product (protected - admin only)
router.put(
  '/:id',
  protect,
  restrictTo('admin'),
  productValidators.productId,
  productValidators.createProduct,
  productController.updateProduct
);

// Delete a product (protected - admin only)
router.delete(
  '/:id',
  protect,
  restrictTo('admin'),
  productValidators.productId,
  productController.deleteProduct
);

module.exports = router;