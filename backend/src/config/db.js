import mongoose from 'mongoose';
import { config } from './env.js';
import pino from 'pino';

const logger = pino({ level: config.logLevel });

let isConnected = false;

/**
 * Ensure email index is correctly configured with sparse and partialFilterExpression
 * This allows multiple null values while enforcing uniqueness for non-null emails
 */
export const ensureEmailIndex = async () => {
  try {
    const collection = mongoose.connection.collection('users');
    const indexes = await collection.indexes();
    
    const emailIndex = indexes.find(idx => idx.name === 'email_1');
    
    // Check if index exists and has correct configuration
    const hasCorrectConfig = emailIndex && 
      emailIndex.sparse === true &&
      emailIndex.partialFilterExpression &&
      emailIndex.partialFilterExpression.email &&
      emailIndex.partialFilterExpression.email.$ne === null;
    
    if (!hasCorrectConfig) {
      logger.warn('Email index needs to be fixed. Dropping and recreating...');
      
      // Drop old index if it exists
      if (emailIndex) {
        try {
          await collection.dropIndex('email_1');
          logger.info('Dropped old email index');
        } catch (error) {
          if (error.code !== 27) { // 27 = IndexNotFound
            throw error;
          }
        }
      }
      
      // Create correct index
      await collection.createIndex(
        { email: 1 },
        { 
          unique: true,
          sparse: true,
          partialFilterExpression: { email: { $ne: null } },
          name: 'email_1'
        }
      );
      logger.info('Email index fixed successfully');
    } else {
      logger.debug('Email index is correctly configured');
    }
  } catch (error) {
    logger.error({ error }, 'Error ensuring email index');
    // Don't throw - allow app to continue even if index fix fails
    // Admin can use /api/v1/admin/fix-email-index endpoint
  }
};

export const connectDB = async () => {
  if (isConnected) {
    logger.info('Using existing database connection');
    return;
  }

  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      // Mongoose 6+ options
    });

    isConnected = true;
    logger.info(`MongoDB connected: ${conn.connection.host}`);

    // Ensure email index is correctly configured
    await ensureEmailIndex();

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      isConnected = true;
    });

  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    isConnected = false;
    throw error;
  }
};

export const disconnectDB = async () => {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting MongoDB:', error);
    throw error;
  }
};

