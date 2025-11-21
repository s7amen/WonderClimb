import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Booking } from '../src/models/booking.js';

dotenv.config();

/**
 * Migration script to update booking index
 * This script drops the old unique index and creates a new partial unique index
 * that only applies to bookings with status 'booked'
 */
async function migrateBookingIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const collection = mongoose.connection.collection('bookings');
    
    // Get existing indexes
    const indexes = await collection.indexes();
    console.log('Existing indexes:', JSON.stringify(indexes, null, 2));

    // Find the old index
    const oldIndexName = 'sessionId_1_climberId_1';
    const hasOldIndex = indexes.some(index => index.name === oldIndexName);

    if (hasOldIndex) {
      console.log(`Dropping old index: ${oldIndexName}`);
      await collection.dropIndex(oldIndexName);
      console.log('Old index dropped successfully');
    } else {
      console.log(`Old index ${oldIndexName} not found, skipping drop`);
    }

    // Create new partial index
    console.log('Creating new partial index...');
    await collection.createIndex(
      { sessionId: 1, climberId: 1 },
      { 
        unique: true,
        partialFilterExpression: { status: 'booked' },
        name: 'sessionId_1_climberId_1'
      }
    );
    console.log('New partial index created successfully');

    // Verify new indexes
    const newIndexes = await collection.indexes();
    console.log('New indexes:', JSON.stringify(newIndexes, null, 2));

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateBookingIndex();

