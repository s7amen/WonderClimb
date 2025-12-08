import api from './api';

export const financeAPI = {
    // Entries
    getEntries: (filters = {}, pagination = {}) => {
        const params = new URLSearchParams();

        // Add filters
        Object.keys(filters).forEach(key => {
            if (filters[key]) params.append(key, filters[key]);
        });

        // Add pagination
        if (pagination.page) params.append('page', pagination.page);
        if (pagination.limit) params.append('limit', pagination.limit);

        return api.get('/finance/entries', { params });
    },

    getTransactions: (filters = {}, pagination = {}) => {
        const params = new URLSearchParams();

        Object.keys(filters).forEach(key => {
            if (filters[key]) params.append(key, filters[key]);
        });

        if (pagination.page) params.append('page', pagination.page);
        if (pagination.limit) params.append('limit', pagination.limit);

        return api.get('/finance/transactions', { params });
    },

    getEntryById: (id) => api.get(`/finance/entries/${id}`),

    createEntry: (data) => api.post('/finance/entries', data),

    updateEntry: (id, data) => api.patch(`/finance/entries/${id}`, data),

    deleteEntry: (id) => api.delete(`/finance/entries/${id}`),

    // Reports
    getSummaryReport: (startDate, endDate, area) => {
        const params = { startDate, endDate };
        if (area) params.area = area;
        return api.get('/finance/reports/summary', { params });
    },

    getGymReport: (startDate, endDate) => {
        return api.get('/finance/reports/gym', {
            params: { startDate, endDate }
        });
    },

    getTrainingReport: (startDate, endDate) => {
        return api.get('/finance/reports/training', {
            params: { startDate, endDate }
        });
    },

    getCoachFees: (startDate, endDate, coachId) => {
        const params = { startDate, endDate };
        if (coachId) params.coachId = coachId;
        return api.get('/finance/reports/coach-fees', { params });
    }
};

export default financeAPI;
