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
  ]
};

module.exports = {
  handleValidationErrors,
  productValidators,
  categoryValidators,
  commonValidators
};