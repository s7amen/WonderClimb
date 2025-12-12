import api from './api';

export const getAuditLogs = async (params) => {
    try {
        const response = await api.get('/admin/logs', { params });
        return response.data;
    } catch (error) {
        throw error;
    }
};
