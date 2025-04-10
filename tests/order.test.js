const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Order = require('../models/order.model');
const User = require('../models/user.model');
const Product = require('../models/product.model');
const Category = require('../models/category.model');
const jwt = require('jsonwebtoken');

// Mock token generation
const generateTestToken = (userId, role = 'customer') => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'your-default-jwt-secret',
    { expiresIn: '1h' }
  );
};

describe('Order API', () => {
  let testUser;
  let adminUser;
  let testProduct;
  let testCategory;
  let testOrder;
  let testUserToken;
  let adminToken;
  
  beforeAll(async () => {
    // Clear test data
    await User.deleteMany({ email: { $in: ['test@example.com', 'admin@example.com'] } });
    await Category.deleteMany({ name: 'Test Category' });
    await Product.deleteMany({ name: 'Test Product' });
    await Order.deleteMany();
    
    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'TestPassword123',
      role: 'customer'
    });
    
    // Create admin user
    adminUser = await User.create({
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      password: 'AdminPassword123',
      role: 'admin'
    });
    
    // Create test category
    testCategory = await Category.create({
      name: 'Test Category',
      slug: 'test-category',
      description: 'Test category description'
    });
    
    // Create test product
    testProduct = await Product.create({
      name: 'Test Product',
      slug: 'test-product',
      description: 'Test product description',
      price: 99.99,
      sku: 'TEST-123',
      inventory: {
        quantity: 100,
        reserved: 0,
        available: 100
      },
      categories: [testCategory._id],
      isPublished: true
    });
    
    // Create test order
    testOrder = await Order.create({
      user: testUser._id,
      items: [
        {
          product: testProduct._id,
          name: testProduct.name,
          price: testProduct.price,
          quantity: 2
        }
      ],
      shippingAddress: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'USA'
      },
      billingAddress: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'USA'
      },
      paymentMethod: 'credit_card',
      shippingMethod: 'standard',
      shippingCost: 5.99,
      subtotal: testProduct.price * 2,
      tax: (testProduct.price * 2) * 0.07,
      totalAmount: (testProduct.price * 2) + 5.99 + ((testProduct.price * 2) * 0.07),
      status: 'pending',
      paymentStatus: 'pending'
    });
    
    // Generate tokens
    testUserToken = generateTestToken(testUser._id);
    adminToken = generateTestToken(adminUser._id, 'admin');
  });
  
  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: { $in: ['test@example.com', 'admin@example.com'] } });
    await Category.deleteMany({ name: 'Test Category' });
    await Product.deleteMany({ name: 'Test Product' });
    await Order.deleteMany();
    
    // Close database connection
    await mongoose.connection.close();
  });
  
  // Test 1: Get all orders (admin only)
  describe('GET /api/orders', () => {
    it('should return 401 if no token provided', async () => {
      const res = await request(app).get('/api/orders');
      expect(res.statusCode).toEqual(401);
    });
    
    it('should return 403 if non-admin token provided', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${testUserToken}`);
      
      expect(res.statusCode).toEqual(403);
    });
    
    it('should return orders list if admin token provided', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.orders)).toBe(true);
      expect(res.body.orders.length).toBeGreaterThan(0);
    });
  });
  
  // Test 2: Get user orders
  describe('GET /api/orders/my-orders', () => {
    it('should return 401 if no token provided', async () => {
      const res = await request(app).get('/api/orders/my-orders');
      expect(res.statusCode).toEqual(401);
    });
    
    it('should return user orders if authenticated', async () => {
      const res = await request(app)
        .get('/api/orders/my-orders')
        .set('Authorization', `Bearer ${testUserToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.orders)).toBe(true);
      expect(res.body.orders.length).toBeGreaterThan(0);
      expect(res.body.orders[0].user.toString()).toBe(testUser._id.toString());
    });
  });
  
  // Test 3: Get order by ID
  describe('GET /api/orders/:id', () => {
    it('should return 401 if no token provided', async () => {
      const res = await request(app).get(`/api/orders/${testOrder._id}`);
      expect(res.statusCode).toEqual(401);
    });
    
    it('should return 403 if token from different user', async () => {
      // Create another user for this test
      const anotherUser = await User.create({
        email: 'another@example.com',
        firstName: 'Another',
        lastName: 'User',
        password: 'Password123',
        role: 'customer'
      });
      
      const anotherToken = generateTestToken(anotherUser._id);
      
      const res = await request(app)
        .get(`/api/orders/${testOrder._id}`)
        .set('Authorization', `Bearer ${anotherToken}`);
      
      expect(res.statusCode).toEqual(403);
      
      // Clean up
      await User.deleteOne({ _id: anotherUser._id });
    });
    
    it('should return order if token from order user', async () => {
      const res = await request(app)
        .get(`/api/orders/${testOrder._id}`)
        .set('Authorization', `Bearer ${testUserToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.order).toBeDefined();
      expect(res.body.order.user._id.toString()).toBe(testUser._id.toString());
    });
    
    it('should return order if admin token provided', async () => {
      const res = await request(app)
        .get(`/api/orders/${testOrder._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.order).toBeDefined();
      expect(res.body.order.user._id.toString()).toBe(testUser._id.toString());
    });
  });
});