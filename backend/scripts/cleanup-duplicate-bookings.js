/**
 * Cleanup script to remove duplicate bookings
 * 
 * This script finds and removes duplicate bookings where:
 * - Same sessionId + climberId + status='booked'
 * - Keeps the most recent booking (by createdAt)
 * - Cancels older duplicates (sets status to 'cancelled')
 * 
 * Usage: node scripts/cleanup-duplicate-bookings.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Booking } from '../src/models/booking.js';
import logger from '../src/middleware/logging.js';

// Load environment variables
dotenv.config();

const cleanupDuplicateBookings = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/wonderclimb';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // Find all active bookings
    const activeBookings = await Booking.find({ status: 'booked' })
      .sort({ createdAt: 1 })
      .lean();

    logger.info({ totalActiveBookings: activeBookings.length }, 'Found active bookings');

    // Group by sessionId + climberId
    const bookingGroups = new Map();
    
    activeBookings.forEach(booking => {
      const sessionId = booking.sessionId?.toString() || booking.sessionId;
      const climberId = booking.climberId?.toString() || booking.climberId;
      
      if (!sessionId || !climberId) {
        logger.warn({ bookingId: booking._id }, 'Booking missing sessionId or climberId, skipping');
        return;
      }
      
      const key = `${sessionId}_${climberId}`;
      
      if (!bookingGroups.has(key)) {
        bookingGroups.set(key, []);
      }
      bookingGroups.get(key).push(booking);
    });

    logger.info({ uniqueGroups: bookingGroups.size }, 'Grouped bookings');

    // Find duplicates and mark older ones for cancellation
    const duplicatesToCancel = [];
    let totalDuplicates = 0;

    bookingGroups.forEach((bookings, key) => {
      if (bookings.length > 1) {
        // Sort by createdAt (most recent first)
        bookings.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA; // Descending order
        });

        // Keep the first (most recent), cancel the rest
        const toKeep = bookings[0];
        const toCancel = bookings.slice(1);

        totalDuplicates += toCancel.length;
        
        logger.info({
          key,
          sessionId: toKeep.sessionId,
          climberId: toKeep.climberId,
          keeping: toKeep._id,
          cancelling: toCancel.map(b => b._id),
          count: toCancel.length,
        }, 'Found duplicate bookings');

        duplicatesToCancel.push(...toCancel.map(b => b._id));
      }
    });

    if (duplicatesToCancel.length === 0) {
      logger.info('No duplicate bookings found');
      await mongoose.disconnect();
      return;
    }

    logger.info({ 
      totalDuplicates: duplicatesToCancel.length,
      totalUniqueGroups: bookingGroups.size 
    }, 'Preparing to cancel duplicate bookings');

    // Cancel duplicate bookings
    const result = await Booking.updateMany(
      { _id: { $in: duplicatesToCancel } },
      { 
        $set: { 
          status: 'cancelled',
          cancelledAt: new Date()
        }
      }
    );

    logger.info({
      matched: result.matchedCount,
      modified: result.modifiedCount,
    }, 'Duplicate bookings cancelled');

    // Verify cleanup
    const remainingActive = await Booking.countDocuments({ status: 'booked' });
    const cancelledCount = await Booking.countDocuments({ 
      _id: { $in: duplicatesToCancel },
      status: 'cancelled'
    });

    logger.info({
      remainingActiveBookings: remainingActive,
      successfullyCancelled: cancelledCount,
      expectedCancelled: duplicatesToCancel.length,
    }, 'Cleanup verification');

    if (cancelledCount === duplicatesToCancel.length) {
      logger.info('✅ All duplicate bookings successfully cancelled');
    } else {
      logger.warn({
        expected: duplicatesToCancel.length,
        actual: cancelledCount,
      }, '⚠️ Some duplicates may not have been cancelled');
    }

    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
    
    console.log('\n✅ Cleanup completed successfully!');
    console.log(`   - Found ${totalDuplicates} duplicate bookings`);
    console.log(`   - Cancelled ${cancelledCount} duplicate bookings`);
    console.log(`   - Remaining active bookings: ${remainingActive}`);
    
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Error during cleanup');
    console.error('\n❌ Cleanup failed:', error.message);
    process.exit(1);
  }
};

// Run cleanup
cleanupDuplicateBookings();










