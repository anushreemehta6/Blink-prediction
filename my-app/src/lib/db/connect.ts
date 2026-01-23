import mongoose from 'mongoose';

// Track connection state
let isConnected = false;

export default async function dbConnect() {
  // If already connected, return
  if (isConnected) {
    console.log('📦 Using existing MongoDB connection');
    return;
  }

  // Check if MONGODB_URI exists
  if (!process.env.MONGODB_URI) {
    throw new Error('❌ MONGODB_URI is not defined in environment variables');
  }

  try {
    // Connect to MongoDB
    const db = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: '3hirty', // Database name
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = db.connections[0].readyState === 1;
    console.log('✅ MongoDB connected successfully');
    
    // Log connection details in debug mode
    if (process.env.DEBUG === 'true') {
      console.log('📊 Database:', db.connections[0].name);
      console.log('🌐 Host:', db.connections[0].host);
    }

    return db;
  } catch (error: any) {
    console.error('❌ MongoDB connection error:', error.message);
    throw new Error(`Failed to connect to MongoDB: ${error.message}`);
  }
}

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('🟢 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('🔴 Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🟡 Mongoose disconnected from MongoDB');
  isConnected = false;
});

// Graceful shutdown
if (process.env.NODE_ENV !== 'production') {
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('👋 MongoDB connection closed through app termination');
    process.exit(0);
  });
}