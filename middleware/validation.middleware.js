const { validationResult, body, param, query } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  
  next();
};

/**
 * Validators for product-related routes
 */
const productValidators = {
  // Validate product creation/update data
  createProduct: [
    body('name')
      .trim()
      .notEmpty().withMessage('Product name is required')
      .isLength({ max: 100 }).withMessage('Product name cannot exceed 100 characters'),
    
    body('description')
      .trim()
      .notEmpty().withMessage('Product description is required'),
    
    body('price')
      .isNumeric().withMessage('Price must be a number')
      .isFloat({ min: 0 }).withMessage('Price cannot be negative'),
    
    body('inventory.quantity')
      .isInt({ min: 0 }).withMessage('Inventory quantity must be a non-negative integer'),
    
    body('categories')
      .isArray().withMessage('Categories must be an array')
      .notEmpty().withMessage('At least one category is required'),
    
    body('sku')
      .trim()
      .notEmpty().withMessage('SKU is required'),
    
    handleValidationErrors
  ],
  
  // Validate product ID
  productId: [
    param('id')
      .isMongoId().withMessage('Invalid product ID'),
    
    handleValidationErrors
  ]
};

/**
 * Validators for category-related routes
 */
const categoryValidators = {
  // Validate category creation/update data
  createCategory: [
    body('name')
      .trim()
      .notEmpty().withMessage('Category name is required'),
    
    body('slug')
      .optional()
      .trim()
      .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('Slug must be URL-friendly'),
    
    body('parent')
      .optional()
      .isMongoId().withMessage('Invalid parent category ID'),
    
    handleValidationErrors
  ],
  
  // Validate category ID
  categoryId: [
    param('id')
      .isMongoId().withMessage('Invalid category ID'),
    
    handleValidationErrors
  ]
};

/**
 * Validators for user-related routes
 */
const userValidators = {
  // Validate user registration
  register: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email address'),
    
    body('firstName')
      .trim()
      .notEmpty().withMessage('First name is required')
      .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters'),
    
    body('lastName')
      .trim()
      .notEmpty().withMessage('Last name is required')
      .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters'),
    
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
    handleValidationErrors
  ],
  
  // Validate login data
  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email address'),
    
    body('password')
      .notEmpty().withMessage('Password is required'),
    
    handleValidationErrors
  ],
  
  // Validate user creation for admin
  createUser: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email address'),
    
    body('firstName')
      .trim()
      .notEmpty().withMessage('First name is required')
      .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters'),
    
    body('lastName')
      .trim()
      .notEmpty().withMessage('Last name is required')
      .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters'),
    
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    
    body('role')
      .optional()
      .isIn(['customer', 'admin']).withMessage('Role must be either customer or admin'),
    
    handleValidationErrors
  ],
  
  // Validate user ID
  userId: [
    param('id')
      .isMongoId().withMessage('Invalid user ID'),
    
    handleValidationErrors
  ],
  
  // Validate address data
  address: [
    body('type')
      .isIn(['shipping', 'billing']).withMessage('Address type must be either shipping or billing'),
    
    body('street')
      .trim()
      .notEmpty().withMessage('Street is required'),
    
    body('city')
      .trim()
      .notEmpty().withMessage('City is required'),
    
    body('state')
      .trim()
      .notEmpty().withMessage('State is required'),
    
    body('postalCode')
      .trim()
      .notEmpty().withMessage('Postal code is required'),
    
    body('country')
      .trim()
      .notEmpty().withMessage('Country is required'),
    
    handleValidationErrors
  ]
};

/**
 * Validators for order-related routes
 */
const orderValidators = {
  // Validate order creation
  createOrder: [
    body('items')
      .isArray().withMessage('Items must be an array')
      .notEmpty().withMessage('Order must contain at least one item'),
    
    body('items.*.product')
      .isMongoId().withMessage('Invalid product ID'),
    
    body('items.*.quantity')
      .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    
    body('shippingAddress')
      .notEmpty().withMessage('Shipping address is required'),
    
    body('shippingAddress.street')
      .trim()
      .notEmpty().withMessage('Street is required'),
    
    body('shippingAddress.city')
      .trim()
      .notEmpty().withMessage('City is required'),
    
    body('shippingAddress.state')
      .trim()
      .notEmpty().withMessage('State is required'),
    
    body('shippingAddress.postalCode')
      .trim()
      .notEmpty().withMessage('Postal code is required'),
    
    body('billingAddress')
      .notEmpty().withMessage('Billing address is required'),
    
    body('billingAddress.street')
      .trim()
      .notEmpty().withMessage('Street is required'),
    
    body('billingAddress.city')
      .trim()
      .notEmpty().withMessage('City is required'),
    
    body('billingAddress.state')
      .trim()
      .notEmpty().withMessage('State is required'),
    
    body('billingAddress.postalCode')
      .trim()
      .notEmpty().withMessage('Postal code is required'),
    
    body('paymentMethod')
      .isIn(['credit_card', 'paypal', 'bank_transfer']).withMessage('Invalid payment method'),
    
    body('shippingMethod')
      .isIn(['standard', 'express', 'overnight']).withMessage('Invalid shipping method'),
    
    handleValidationErrors
  ],
  
  // Validate order status update
  updateOrderStatus: [
    body('status')
      .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid order status'),
    
    handleValidationErrors
  ],
  
  // Validate payment status update
  updatePaymentStatus: [
    body('paymentStatus')
      .isIn(['pending', 'processing', 'paid', 'failed', 'refunded']).withMessage('Invalid payment status'),
    
    handleValidationErrors
  ],
  
  // Validate order ID
  orderId: [
    param('id')
      .isMongoId().withMessage('Invalid order ID'),
    
    handleValidationErrors
  ]
};

/**
 * Common validators for pagination and filtering
 */
const commonValidators = {
  // Validate pagination parameters
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    
    handleValidationErrors
  ],
  
  // Validate sorting parameters
  sorting: [
    query('sortBy')
      .optional()
      .isString().withMessage('Sort field must be a string'),
    
    query('order')
      .optional()
      .isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
    
    handleValidationErrors
  ],
  
  // Validate date range parameters
  dateRange: [
    query('startDate')
      .optional()
      .isISO8601().withMessage('Start date must be in ISO format'),
    
    query('endDate')
      .optional()
      .isISO8601().withMessage('End date must be in ISO format'),
    
    handleValidationErrors
  ]
};

module.exports = {
  handleValidationErrors,
  productValidators,
  categoryValidators,
  userValidators,
  orderValidators,
  commonValidators
};