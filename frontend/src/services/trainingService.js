import api from './api';

export const trainingService = {
    // Bookings
    getAllBookings: async (filters = {}, pagination = {}) => {
        const queryParams = new URLSearchParams();

        if (filters.sessionId) queryParams.append('sessionId', filters.sessionId);
        if (filters.climberId) queryParams.append('climberId', filters.climberId);
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.startDate) queryParams.append('startDate', filters.startDate);
        if (filters.endDate) queryParams.append('endDate', filters.endDate);

        if (pagination.page) queryParams.append('page', pagination.page);
        if (pagination.limit) queryParams.append('limit', pagination.limit);

        const response = await api.get(`/training/bookings?${queryParams.toString()}`);
        return response.data;
    },

    cancelBooking: async (bookingId) => {
        const response = await api.delete(`/bookings/${bookingId}`);
        return response.data;
    },

    // Sessions (Re-exporting or adding here if needed, but keeping focused on bookings for now)
    getSessionById: async (sessionId) => {
        const response = await api.get(`/training/sessions/${sessionId}`);
        return response.data;
    }
};
