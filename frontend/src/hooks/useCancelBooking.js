import { useState } from 'react';
import { bookingsAPI } from '../services/api';

/**
 * Custom hook for handling booking cancellations
 * Provides centralized logic for canceling bookings with error handling
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.onSuccess - Callback when all cancellations succeed
 * @param {Function} options.onPartialSuccess - Callback when some cancellations succeed
 * @param {Function} options.showToast - Toast notification function
 * @returns {Object} Hook state and functions
 */
export const useCancelBooking = ({ onSuccess, onPartialSuccess, showToast } = {}) => {
    const [cancelError, setCancelError] = useState(null);
    const [isCancelling, setIsCancelling] = useState(false);

    /**
     * Cancel multiple bookings
     * @param {Array} bookingIds - Array of booking IDs to cancel
     * @param {Array} bookingsData - Array of booking objects with metadata (for error messages)
     * @returns {Object} Results object with successful and failed arrays
     */
    const cancelBookings = async (bookingIds, bookingsData = []) => {
        if (!bookingIds || bookingIds.length === 0) {
            setCancelError('Моля, изберете поне една резервация за отмяна');
            return { successful: [], failed: [] };
        }

        setIsCancelling(true);
        setCancelError(null);

        const results = {
            successful: [],
            failed: []
        };
        let hasOuterError = false;

        try {
            // Process each cancellation
            for (const bookingId of bookingIds) {
                try {
                    await bookingsAPI.cancel(bookingId);
                    results.successful.push(bookingId);
                } catch (error) {
                    results.failed.push({
                        bookingId,
                        reason: error.response?.data?.error?.message || 'Грешка при отмяна'
                    });
                }
            }

            // Handle results
            if (results.successful.length > 0 && showToast) {
                const cancelledCount = results.successful.length;
                showToast(
                    cancelledCount === 1
                        ? 'Резервацията е отменена успешно'
                        : `${cancelledCount} резервации са отменени успешно`,
                    'success'
                );
            }

            if (results.failed.length > 0) {
                // Build detailed error message
                const failedDetails = results.failed.map(item => {
                    const booking = bookingsData.find(b =>
                        b._id === item.bookingId || b.bookingId === item.bookingId
                    );
                    const climberName = booking?.climberName ||
                        (booking?.climber ? `${booking.climber.firstName} ${booking.climber.lastName}` : 'Катерач');
                    return `${climberName}: ${item.reason || 'Грешка'}`;
                }).join('\n');

                setCancelError(failedDetails);
            }

            // Call appropriate callback
            if (results.successful.length > 0 && results.failed.length > 0) {
                // Partial success
                if (onPartialSuccess) {
                    onPartialSuccess(results);
                }
            } else if (results.successful.length > 0) {
                // Full success
                if (onSuccess) {
                    onSuccess(results);
                }
            }

        } catch (error) {
            hasOuterError = true;
            setCancelError('Грешка при отменяне на резервация');
            console.error('Cancel booking error:', error);
        } finally {
            setIsCancelling(false);
        }

        return {
            ...results,
            hasOuterError,
            shouldCloseModal: results.failed.length === 0 && !hasOuterError
        };
    };

    /**
     * Reset error state
     */
    const resetError = () => {
        setCancelError(null);
    };

    return {
        // State
        cancelError,
        isCancelling,

        // Functions
        cancelBookings,
        resetError,
    };
};

export default useCancelBooking;
