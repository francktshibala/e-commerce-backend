const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
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

describe('User API', () => {
  let testUser;
  let adminUser;
  let testUserToken;
  let adminToken;
  
  beforeAll(async () => {
    // Clear test users before tests
    await User.deleteMany({ email: { $in: ['test@example.com', 'admin@example.com'] } });
    
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
    
    // Generate tokens
    testUserToken = generateTestToken(testUser._id);
    adminToken = generateTestToken(adminUser._id, 'admin');
  });
  
  afterAll(async () => {
    // Clean up test users
    await User.deleteMany({ email: { $in: ['test@example.com', 'admin@example.com'] } });
    
    // Close database connection
    await mongoose.connection.close();
  });
  
  // Test 1: Get all users - should require admin access
  describe('GET /api/users', () => {
    it('should return 401 if no token provided', async () => {
      const res = await request(app).get('/api/users');
      expect(res.statusCode).toEqual(401);
    });
    
    it('should return 403 if non-admin token provided', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${testUserToken}`);
      
      expect(res.statusCode).toEqual(403);
    });
    
    it('should return users list if admin token provided', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users.length).toBeGreaterThan(0);
    });
  });
  
  // Test 2: Get user by ID
  describe('GET /api/users/:id', () => {
    it('should return 401 if no token provided', async () => {
      const res = await request(app).get(`/api/users/${testUser._id}`);
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
        .get(`/api/users/${testUser._id}`)
        .set('Authorization', `Bearer ${anotherToken}`);
      
      expect(res.statusCode).toEqual(403);
      
      // Clean up
      await User.deleteOne({ _id: anotherUser._id });
    });
    
    it('should return user if token from same user', async () => {
      const res = await request(app)
        .get(`/api/users/${testUser._id}`)
        .set('Authorization', `Bearer ${testUserToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
    });
    
    it('should return user if admin token provided', async () => {
      const res = await request(app)
        .get(`/api/users/${testUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
    });
  });
  
  // Test 3: Get user profile
  describe('GET /api/users/profile', () => {
    it('should return 401 if no token provided', async () => {
      const res = await request(app).get('/api/users/profile');
      expect(res.statusCode).toEqual(401);
    });
    
    it('should return user profile if authenticated', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${testUserToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
    });
  });
});