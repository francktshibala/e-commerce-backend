const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Product = require('../models/product.model');
const Category = require('../models/category.model');
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');

// Mock token generation
const generateTestToken = (userId, role = 'customer') => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'your-default-jwt-secret',
    { expiresIn: '1h' }
  );
};

describe('Product API', () => {
  let testCategory;
  let testProduct;
  let adminUser;
  let adminToken;
  
  beforeAll(async () => {
    // Clear test data
    await Category.deleteMany({ name: 'Test Category' });
    await Product.deleteMany({ name: 'Test Product' });
    await User.deleteMany({ email: 'admin@example.com' });
    
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
    
    // Generate token
    adminToken = generateTestToken(adminUser._id, 'admin');
  });
  
  afterAll(async () => {
    // Clean up test data
    await Category.deleteMany({ name: 'Test Category' });
    await Product.deleteMany({ name: 'Test Product' });
    await User.deleteMany({ email: 'admin@example.com' });
    
    // Close database connection
    await mongoose.connection.close();
  });
  
  // Test 1: Get all products
  describe('GET /api/products', () => {
    it('should return a list of products', async () => {
      const res = await request(app).get('/api/products');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.products.length).toBeGreaterThan(0);
    });
    
    it('should filter products by category', async () => {
      const res = await request(app)
        .get(`/api/products?category=${testCategory._id}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.products.length).toBeGreaterThan(0);
      
      // Check that all returned products have the test category
      res.body.products.forEach(product => {
        expect(product.categories.some(cat => 
          cat._id.toString() === testCategory._id.toString() || 
          cat.toString() === testCategory._id.toString()
        )).toBe(true);
      });
    });
    
    it('should return products with pagination', async () => {
      const res = await request(app)
        .get('/api/products?page=1&limit=10');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.currentPage).toBe(1);
      expect(res.body.totalPages).toBeGreaterThanOrEqual(1);
      expect(res.body.products.length).toBeLessThanOrEqual(10);
    });
    
    it('should sort products by price', async () => {
      const res = await request(app)
        .get('/api/products?sortBy=price&order=asc');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      
      // Check that products are sorted by price in ascending order
      for (let i = 1; i < res.body.products.length; i++) {
        expect(res.body.products[i].price).toBeGreaterThanOrEqual(res.body.products[i-1].price);
      }
    });
  });
  
  // Test 2: Get product by ID
  describe('GET /api/products/:id', () => {
    it('should return a product by ID', async () => {
      const res = await request(app)
        .get(`/api/products/${testProduct._id}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.product).toBeDefined();
      expect(res.body.product._id).toBe(testProduct._id.toString());
      expect(res.body.product.name).toBe(testProduct.name);
    });
    
    it('should return a product by slug', async () => {
      const res = await request(app)
        .get(`/api/products/${testProduct.slug}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.product).toBeDefined();
      expect(res.body.product.slug).toBe(testProduct.slug);
    });
    
    it('should return 404 for non-existent product', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/products/${nonExistentId}`);
      
      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
    });
  });
});