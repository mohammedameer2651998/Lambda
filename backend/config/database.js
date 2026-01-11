const mongoose = require('mongoose');
const { getSecret } = require('./secrets');

// Connection state tracking
let isConnected = false;

/**
 * Connect to MongoDB
 * Fetches connection string from AWS Secrets Manager or falls back to .env
 */
const connectDB = async () => {
  // If already connected, don't reconnect
  if (isConnected) {
    console.log('Using existing MongoDB connection');
    return;
  }

  try {
    let mongoUri;

    // Try to get from AWS Secrets Manager first
    if (process.env.USE_AWS_SECRETS === 'true') {
      try {
        mongoUri = await getSecret('MONGODB_URI');
        console.log('✅ Using MongoDB URI from AWS Secrets Manager');
      } catch (error) {
        console.warn('⚠️ Failed to fetch from Secrets Manager, falling back to .env');
        mongoUri = process.env.MONGODB_URI;
      }
    } else {
      // Use .env directly (for local development)
      mongoUri = process.env.MONGODB_URI;
      console.log('📁 Using MongoDB URI from .env file');
    }

    if (!mongoUri) {
      throw new Error('MongoDB URI not found in secrets or environment');
    }

    // Connect to MongoDB
    const db = await mongoose.connect(mongoUri);

    isConnected = db.connections[0].readyState === 1;
    console.log('MongoDB connected successfully');
    console.log(`Database: ${db.connections[0].name}`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
  isConnected = false;
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app termination');
  process.exit(0);
});

module.exports = { connectDB };