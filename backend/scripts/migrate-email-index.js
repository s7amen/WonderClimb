import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../src/models/user.js';

dotenv.config();

/**
 * Migration script to fix email index
 * This script drops the old email index and creates a new sparse unique index
 * with partialFilterExpression that allows multiple null values
 */
async function migrateEmailIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const collection = mongoose.connection.collection('users');
    
    // Get existing indexes
    const indexes = await collection.indexes();
    console.log('Existing indexes:', JSON.stringify(indexes, null, 2));

    // Find the old email index
    const oldIndexName = 'email_1';
    const hasOldIndex = indexes.some(index => index.name === oldIndexName);

    if (hasOldIndex) {
      console.log(`Dropping old index: ${oldIndexName}`);
      try {
        await collection.dropIndex(oldIndexName);
        console.log('Old index dropped successfully');
      } catch (error) {
        if (error.code === 27) { // IndexNotFound
          console.log('Index already dropped or does not exist');
        } else {
          throw error;
        }
      }
    } else {
      console.log(`Old index ${oldIndexName} not found, skipping drop`);
    }

    // Create new sparse index with partialFilterExpression
    console.log('Creating new sparse unique index with partialFilterExpression...');
    await collection.createIndex(
      { email: 1 },
      { 
        unique: true,
        sparse: true,
        partialFilterExpression: { email: { $ne: null } },
        name: 'email_1'
      }
    );
    console.log('New sparse index created successfully');

    // Verify new indexes
    const newIndexes = await collection.indexes();
    const emailIndex = newIndexes.find(idx => idx.name === 'email_1');
    console.log('Email index configuration:', JSON.stringify(emailIndex, null, 2));

    console.log('Migration completed successfully!');
    console.log('The email index now allows multiple null values while enforcing uniqueness for non-null emails.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateEmailIndex();

