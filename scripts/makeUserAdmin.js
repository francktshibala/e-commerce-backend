// Run this script with: node scripts/makeUserAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

// Connect to database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Function to update user role
const makeUserAdmin = async (email) => {
  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    user.role = 'admin';
    await user.save();
    
    console.log(`User ${email} has been updated to admin role`);
  } catch (error) {
    console.error('Error updating user:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Replace 'your-email@example.com' with your actual email
makeUserAdmin('your-email@example.com');