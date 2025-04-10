const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { orderValidators, commonValidators } = require('../middleware/validation.middleware');

// Get all orders (admin only)
router.get(
  '/',
  protect,
  restrictTo('admin'),
  commonValidators.pagination,
  commonValidators.sorting,
  commonValidators.dateRange,
  orderController.getOrders
);

// Get user's orders (authenticated user)
router.get(
  '/my-orders',
  protect,
  commonValidators.pagination,
  commonValidators.sorting,
  orderController.getUserOrders
);

// Create a new order (authenticated user)
router.post(
  '/',
  protect,
  orderValidators.createOrder,
  orderController.createOrder
);

// Get a specific order (admin or order owner)
router.get(
  '/:id',
  protect,
  orderValidators.orderId,
  orderController.getOrder
);

// Update an order (admin only)
router.put(
  '/:id',
  protect,
  restrictTo('admin'),
  orderValidators.orderId,
  orderController.updateOrder
);

// Delete an order (admin only)
router.delete(
  '/:id',
  protect,
  restrictTo('admin'),
  orderValidators.orderId,
  orderController.deleteOrder
);

// Update order payment status (admin only)
router.patch(
  '/:id/payment',
  protect,
  restrictTo('admin'),
  orderValidators.orderId,
  orderValidators.updatePaymentStatus,
  orderController.updateOrderPayment
);

module.exports = router;