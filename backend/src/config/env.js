import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'NODE_ENV'
];

// Validate required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  mongodbUri: process.env.MONGODB_URI,

  // Authentication
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Booking configuration
  bookingHorizonHours: parseInt(process.env.BOOKING_HORIZON_HOURS || '720', 10), // Default: 30 days = 720 hours
  cancellationWindowHours: parseInt(process.env.CANCELLATION_WINDOW_HOURS || '4', 10),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

