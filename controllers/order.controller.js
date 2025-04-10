const Order = require('../models/order.model');
const Product = require('../models/product.model');
const User = require('../models/user.model');
const { ApiError } = require('../middleware/error.middleware');

/**
 * Get all orders
 * @route GET /api/orders
 * @access Admin only
 */
const getOrders = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc',
      status,
      user: userId,
      startDate,
      endDate
    } = req.query;
    
    // Build filter object
    const filter = {};
    
    // Status filter
    if (status) {
      filter.status = status;
    }
    
    // User filter
    if (userId) {
      filter.user = userId;
    }
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }
    
    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;
    
    // Execute query with pagination
    const orders = await Order.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .populate('user', 'firstName lastName email')
      .populate('items.product', 'name slug');
    
    // Get total count for pagination
    const totalOrders = await Order.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: orders.length,
      total: totalOrders,
      totalPages: Math.ceil(totalOrders / Number(limit)),
      currentPage: Number(page),
      orders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user orders
 * @route GET /api/orders/my-orders
 * @access Private
 */
const getUserOrders = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc',
      status
    } = req.query;
    
    // Build filter object
    const filter = { user: req.user.id };
    
    // Status filter
    if (status) {
      filter.status = status;
    }
    
    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;
    
    // Execute query with pagination
    const orders = await Order.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .populate('items.product', 'name slug images');
    
    // Get total count for pagination
    const totalOrders = await Order.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: orders.length,
      total: totalOrders,
      totalPages: Math.ceil(totalOrders / Number(limit)),
      currentPage: Number(page),
      orders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get order by ID
 * @route GET /api/orders/:id
 * @access Admin or Own User
 */
const getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find order
    const order = await Order.findById(id)
      .populate('user', 'firstName lastName email')
      .populate('items.product', 'name slug images');
    
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    
    // Check if user has permission to view this order
    if (req.user.role !== 'admin' && order.user._id.toString() !== req.user.id) {
      throw new ApiError(403, 'Not authorized to access this order');
    }
    
    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new order
 * @route POST /api/orders
 * @access Private
 */
const createOrder = async (req, res, next) => {
  try {
    const {
      items,
      shippingAddress,
      billingAddress,
      paymentMethod,
      shippingMethod,
      notes
    } = req.body;
    
    // Check if items array is provided and not empty
    if (!items || items.length === 0) {
      throw new ApiError(400, 'Order must contain at least one item');
    }
    
    // Validate and get product details for each item
    const orderItems = [];
    let subtotal = 0;
    let errorMessages = [];
    
    for (const item of items) {
      // Find product and check availability
      const product = await Product.findById(item.product);
      
      if (!product) {
        errorMessages.push(`Product not found with ID: ${item.product}`);
        continue;
      }
      
      if (product.inventory.available < item.quantity) {
        errorMessages.push(`Insufficient inventory for product: ${product.name}`);
        continue;
      }
      
      // Add valid item to order
      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        variant: item.variant || null
      });
      
      // Update subtotal
      subtotal += product.price * item.quantity;
      
      // Update product inventory
      product.inventory.reserved += item.quantity;
      product.inventory.available = product.inventory.quantity - product.inventory.reserved;
      await product.save();
    }
    
    // If any products had errors, abort order creation
    if (errorMessages.length > 0) {
      throw new ApiError(400, 'Order validation failed', errorMessages);
    }
    
    // Calculate tax and shipping cost
    const shippingCost = calculateShippingCost(shippingMethod);
    const tax = calculateTax(subtotal);
    const totalAmount = subtotal + shippingCost + tax;
    
    // Create order
    const order = new Order({
      user: req.user.id,
      items: orderItems,
      shippingAddress,
      billingAddress,
      paymentMethod,
      shippingMethod,
      shippingCost,
      subtotal,
      tax,
      totalAmount,
      notes,
      status: 'pending',
      paymentStatus: 'pending'
    });
    
    await order.save();
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update order
 * @route PUT /api/orders/:id
 * @access Admin only
 */
const updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Find order
    const order = await Order.findById(id);
    
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    
    // Handle status changes and trigger appropriate actions
    if (updates.status && updates.status !== order.status) {
      switch (updates.status) {
        case 'cancelled':
          // Return reserved inventory when order is cancelled
          for (const item of order.items) {
            const product = await Product.findById(item.product);
            if (product) {
              product.inventory.reserved -= item.quantity;
              product.inventory.available = product.inventory.quantity - product.inventory.reserved;
              await product.save();
            }
          }
          break;
          
        case 'shipped':
          // When order is shipped, confirm inventory reduction
          for (const item of order.items) {
            const product = await Product.findById(item.product);
            if (product) {
              product.inventory.quantity -= item.quantity;
              product.inventory.reserved -= item.quantity;
              product.inventory.available = product.inventory.quantity - product.inventory.reserved;
              await product.save();
            }
          }
          
          // Set tracking number if provided
          if (updates.trackingNumber) {
            order.trackingNumber = updates.trackingNumber;
          }
          break;
      }
    }
    
    // Update order
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('user', 'firstName lastName email')
      .populate('items.product', 'name slug');
    
    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      order: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete order
 * @route DELETE /api/orders/:id
 * @access Admin only
 */
const deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find order
    const order = await Order.findById(id);
    
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    
    // Only pending orders can be deleted
    if (order.status !== 'pending') {
      throw new ApiError(400, 'Only pending orders can be deleted');
    }
    
    // Return reserved inventory
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.inventory.reserved -= item.quantity;
        product.inventory.available = product.inventory.quantity - product.inventory.reserved;
        await product.save();
      }
    }
    
    // Delete order
    await order.remove();
    
    res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update order payment status
 * @route PATCH /api/orders/:id/payment
 * @access Admin only
 */
const updateOrderPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentDetails } = req.body;
    
    if (!paymentStatus) {
      throw new ApiError(400, 'Payment status is required');
    }
    
    // Find order
    const order = await Order.findById(id);
    
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    
    // Update payment information
    order.paymentStatus = paymentStatus;
    
    if (paymentDetails) {
      order.paymentDetails = paymentDetails;
    }
    
    // If payment is completed, update order status if it's still pending
    if (paymentStatus === 'paid' && order.status === 'pending') {
      order.status = 'processing';
    }
    
    await order.save();
    
    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      order
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to calculate shipping cost
const calculateShippingCost = (shippingMethod) => {
  switch (shippingMethod) {
    case 'express':
      return 15.99;
    case 'overnight':
      return 29.99;
    case 'standard':
    default:
      return 5.99;
  }
};

// Helper function to calculate tax
const calculateTax = (subtotal) => {
  // Simple tax calculation (e.g., 7% tax rate)
  return parseFloat((subtotal * 0.07).toFixed(2));
};

module.exports = {
  getOrders,
  getUserOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  updateOrderPayment
};