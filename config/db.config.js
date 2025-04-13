const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Removed deprecated options useNewUrlParser and useUnifiedTopology
    // as they're no longer needed in MongoDB Driver 4.0.0+ and Mongoose 6.0+
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommercedb');
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle MongoDB connection errors after initial connection
    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err}`);
    });
    
    // Log when the MongoDB connection is disconnected
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
    // Gracefully close MongoDB connection when Node process ends
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });
    
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

connectDB();

module.exports = mongoose.connection;