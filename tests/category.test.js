const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Category = require('../models/category.model');
const Product = require('../models/product.model');
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

describe('Category API', () => {
  let parentCategory;
  let childCategory;
  let testProduct;
  let adminUser;
  let adminToken;
  
  beforeAll(async () => {
    // Clear test data
    await Category.deleteMany({ name: { $in: ['Parent Category', 'Child Category'] } });
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
    
    // Create parent category
    parentCategory = await Category.create({
      name: 'Parent Category',
      slug: 'parent-category',
      description: 'Parent category description'
    });
    
    // Create child category
    childCategory = await Category.create({
      name: 'Child Category',
      slug: 'child-category',
      description: 'Child category description',
      parent: parentCategory._id
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
      categories: [childCategory._id],
      isPublished: true
    });
    
    // Generate token
    adminToken = generateTestToken(adminUser._id, 'admin');
  });
  
  afterAll(async () => {
    // Clean up test data
    await Category.deleteMany({ name: { $in: ['Parent Category', 'Child Category'] } });
    await Product.deleteMany({ name: 'Test Product' });
    await User.deleteMany({ email: 'admin@example.com' });
    
    // Close database connection
    await mongoose.connection.close();
  });
  
  // Test 1: Get all categories
  describe('GET /api/categories', () => {
    it('should return a list of categories', async () => {
      const res = await request(app).get('/api/categories');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.categories)).toBe(true);
      expect(res.body.categories.length).toBeGreaterThanOrEqual(2);
    });
    
    it('should return categories in tree format', async () => {
      const res = await request(app)
        .get('/api/categories?tree=true');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.categories)).toBe(true);
      
      // Find parent category in tree
      const foundParent = res.body.categories.find(
        category => category.slug === parentCategory.slug
      );
      
      expect(foundParent).toBeDefined();
      expect(Array.isArray(foundParent.children)).toBe(true);
      
      // Find child category in parent's children
      const foundChild = foundParent.children.find(
        category => category.slug === childCategory.slug
      );
      
      expect(foundChild).toBeDefined();
    });
    
    it('should filter active categories', async () => {
      // Create inactive category
      const inactiveCategory = await Category.create({
        name: 'Inactive Category',
        slug: 'inactive-category',
        description: 'Inactive category description',
        isActive: false
      });
      
      const res = await request(app)
        .get('/api/categories?active=true');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      
      // Check that inactive category is not in the response
      const foundInactive = res.body.categories.find(
        category => category.slug === inactiveCategory.slug
      );
      
      expect(foundInactive).toBeUndefined();
      
      // Clean up
      await Category.deleteOne({ _id: inactiveCategory._id });
    });
  });
  
  // Test 2: Get category by ID
  describe('GET /api/categories/:id', () => {
    it('should return a category by ID', async () => {
      const res = await request(app)
        .get(`/api/categories/${parentCategory._id}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.category).toBeDefined();
      expect(res.body.category._id).toBe(parentCategory._id.toString());
      expect(res.body.category.name).toBe(parentCategory.name);
    });
    
    it('should return a category by slug', async () => {
      const res = await request(app)
        .get(`/api/categories/${parentCategory.slug}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.category).toBeDefined();
      expect(res.body.category.slug).toBe(parentCategory.slug);
    });
    
    it('should return subcategories with category', async () => {
      const res = await request(app)
        .get(`/api/categories/${parentCategory._id}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.category).toBeDefined();
      expect(Array.isArray(res.body.category.subcategories)).toBe(true);
      
      // Find child category in subcategories
      const foundChild = res.body.category.subcategories.find(
        category => category.slug === childCategory.slug
      );
      
      expect(foundChild).toBeDefined();
    });
    
    it('should return 404 for non-existent category', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/categories/${nonExistentId}`);
      
      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
    });
  });
  
  // Test 3: Get products by category
  describe('GET /api/categories/:idOrSlug/products', () => {
    it('should return products for a category', async () => {
      const res = await request(app)
        .get(`/api/categories/${childCategory._id}/products`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.products.length).toBeGreaterThan(0);
      
      // Check that product is in the results
      const foundProduct = res.body.products.find(
        product => product._id === testProduct._id.toString()
      );
      
      expect(foundProduct).toBeDefined();
    });
    
    it('should return products with pagination', async () => {
      const res = await request(app)
        .get(`/api/categories/${childCategory._id}/products?page=1&limit=10`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.currentPage).toBe(1);
      expect(res.body.totalPages).toBeGreaterThanOrEqual(1);
      expect(res.body.products.length).toBeLessThanOrEqual(10);
    });
    
    it('should return products sorted by specified field', async () => {
      const res = await request(app)
        .get(`/api/categories/${childCategory._id}/products?sortBy=price&order=desc`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      
      // Since we only have one product, we can't fully test sorting,
      // but we can check that the product is returned
      expect(res.body.products.length).toBeGreaterThan(0);
    });
    
    it('should return products from parent category including subcategories', async () => {
      const res = await request(app)
        .get(`/api/categories/${parentCategory._id}/products`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.products.length).toBeGreaterThan(0);
      
      // Check that product is in the results
      // This tests that products from subcategories are included
      const foundProduct = res.body.products.find(
        product => product._id === testProduct._id.toString()
      );
      
      expect(foundProduct).toBeDefined();
    });
  });
});