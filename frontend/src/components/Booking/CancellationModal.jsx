import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import BaseModal from '../UI/BaseModal';
import Button from '../UI/Button';

/**
 * Reusable modal for canceling bookings
 * Displays session info, list of bookings, and handles cancellation confirmation
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close modal handler
 * @param {Object} props.session - Session object to display
 * @param {Array} props.bookings - Array of booking objects to cancel
 * @param {Function} props.onConfirm - Confirmation handler (receives selected booking IDs)
 * @param {string} props.error - Error message to display
 * @param {boolean} props.isLoading - Loading state
 */
const CancellationModal = ({
    isOpen,
    onClose,
    session,
    bookings = [],
    onConfirm,
    error,
    isLoading = false,
}) => {
    const [selectedBookingIds, setSelectedBookingIds] = useState([]);

    // Initialize selected IDs when bookings change
    useEffect(() => {
        if (bookings.length > 0) {
            setSelectedBookingIds(bookings.map(b => b.bookingId || b._id));
        }
    }, [bookings]);

    const formatTime = (date) => {
        return format(new Date(date), 'HH:mm');
    };

    const getEndTime = (startDate, durationMinutes) => {
        const end = new Date(new Date(startDate).getTime() + durationMinutes * 60000);
        return format(end, 'HH:mm');
    };

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm(selectedBookingIds);
        }
    };

    const handleClose = () => {
        setSelectedBookingIds([]);
        if (onClose) {
            onClose();
        }
    };

    const toggleBookingSelection = (bookingId) => {
        setSelectedBookingIds(prev =>
            prev.includes(bookingId)
                ? prev.filter(id => id !== bookingId)
                : [...prev, bookingId]
        );
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            title="Отмени резервация"
            size="md"
            className="rounded-2xl"
            footer={
                <div className="flex gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Отказ
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isLoading || selectedBookingIds.length === 0}
                        variant="danger"
                        className="flex-1 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            'Отменяне...'
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Отмени
                            </>
                        )}
                    </Button>
                </div>
            }
        >
            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border-2 border-red-300 rounded-[10px] p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm sm:text-[16px] font-medium text-red-900 leading-tight sm:leading-[24px] whitespace-pre-line break-words">
                                {error}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Session Info */}
            {session && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                    <div className="font-semibold text-[#0f172b] mb-1">
                        {session.title || 'Тренировка'}
                    </div>
                    <div className="text-sm text-[#64748b]">
                        {format(new Date(session.date), 'PPpp')} - {formatTime(session.date)} - {getEndTime(session.date, session.durationMinutes)}
                    </div>
                </div>
            )}

            {/* Bookings List */}
            {bookings.length > 0 ? (
                <>
                    <div className="mb-4">
                        <p className="text-sm text-[#64748b] mb-3">
                            {bookings.length === 1
                                ? 'Избери резервация за отменяне:'
                                : 'Избери резервации за отменяне:'}
                        </p>
                        <div className="space-y-2">
                            {bookings.map((booking) => {
                                const bookingId = booking.bookingId || booking._id;
                                const isSelected = selectedBookingIds.includes(bookingId);
                                const climberName = booking.climberName ||
                                    (booking.climber ? `${booking.climber.firstName} ${booking.climber.lastName}` : 'Катерач');

                                return (
                                    <label
                                        key={bookingId}
                                        className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${isSelected
                                            ? 'border-red-500 bg-red-50 shadow-sm'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleBookingSelection(bookingId)}
                                                className="w-5 h-5 text-red-500 border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:ring-offset-2 cursor-pointer"
                                                disabled={isLoading}
                                            />
                                        </div>
                                        <span className="ml-3 text-base font-medium text-[#0f172b]">
                                            {climberName}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </>
            ) : (
                <p className="text-sm text-[#64748b] mb-6 text-center py-4">
                    Няма налични резервации за отменяне.
                </p>
            )}
        </BaseModal>
    );
};

export default CancellationModal;
