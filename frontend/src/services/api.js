import axios from 'axios';

const DEFAULT_DEV_API_URL = 'http://localhost:3000/api/v1';
const DEFAULT_PROD_API_URL = 'https://wonderclimb.fly.dev/api/v1';

const normalizeBaseUrl = (url) => {
  if (!url) return url;
  return url.replace(/\/+$/, '');
};

const resolveApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl) {
    return normalizeBaseUrl(envUrl);
  }

  // Keep localhost for vite dev server, otherwise fall back to hosted API.
  return import.meta.env.DEV ? DEFAULT_DEV_API_URL : DEFAULT_PROD_API_URL;
};

export const API_BASE_URL = resolveApiBaseUrl();

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
          withCredentials: true,
        });

        const { token: newToken } = response.data;
        localStorage.setItem('token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        isRefreshing = false;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Log 403 errors for debugging
    if (error.response?.status === 403) {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const errorDetails = error.response?.data?.error?.details || {};
      console.error('403 Forbidden Error - Full Details:', {
        url: error.config?.url,
        method: error.config?.method,
        requestData: error.config?.data,
        errorData: error.response?.data,
        errorMessage: error.response?.data?.error?.message,
        errorDetails: errorDetails,
        userRolesFromError: errorDetails.userRoles,
        requiredRolesFromError: errorDetails.requiredRoles,
        user: userData,
        userRoles: userData?.roles,
        userRolesType: typeof userData?.roles,
        userRolesIsArray: Array.isArray(userData?.roles),
        token: localStorage.getItem('token')?.substring(0, 20) + '...',
      });

      // Decode token to see what roles are actually in the token
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            console.error('Token payload:', {
              id: payload.id,
              email: payload.email,
              roles: payload.roles,
              rolesArray: Array.isArray(payload.roles) ? payload.roles : [payload.roles].filter(Boolean),
              rolesLength: Array.isArray(payload.roles) ? payload.roles.length : (payload.roles ? 1 : 0),
              rolesType: typeof payload.roles,
              rolesIsArray: Array.isArray(payload.roles),
              rolesString: JSON.stringify(payload.roles),
            });
          }
        }
      } catch (e) {
        console.error('Error decoding token:', e);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout', {}, { withCredentials: true }),
  refresh: () => api.post('/auth/refresh', {}, { withCredentials: true }),
};

// Sessions API
export const sessionsAPI = {
  // Public - get available sessions (no auth required)
  getAvailable: (params) => api.get('/sessions', { params }),

  // Admin - session management
  getById: (id) => api.get(`/admin/sessions/${id}`),
  create: (data) => api.post('/admin/sessions', data),
  createBulk: (data) => api.post('/admin/sessions/bulk', data),
  update: (id, data) => api.put(`/admin/sessions/${id}`, data),
  updatePayoutStatus: (id, payoutStatus) => api.patch(`/admin/sessions/${id}/payout-status`, { payoutStatus }),
  getRoster: (sessionId) => api.get(`/admin/sessions/${sessionId}/roster`),
  createManualBooking: (sessionId, climberId) => api.post(`/admin/sessions/${sessionId}/bookings`, { climberId }),

  // Admin - get all sessions (using calendar with wide date range)
  getAll: async (startDate, endDate) => {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    return api.get('/admin/calendar', {
      params: { view: 'month', startDate: start, endDate: end }
    });
  },

  // Admin - calendar
  getCalendar: (params) => api.get('/admin/calendar', { params }),

  // Coach - today's sessions
  getTodaysSessions: () => api.get('/coaches/me/sessions/today'),
};

// Admin API
export const adminAPI = {
  getAllClimbers: () => api.get('/admin/climbers'),
};

// Settings API
export const settingsAPI = {
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
};

// Bookings API
export const bookingsAPI = {
  create: (data) => api.post('/bookings', data),
  createRecurring: (data) => api.post('/bookings/recurring', data),
  cancel: (id) => api.delete(`/bookings/${id}`),
  getMyBookings: () => api.get('/parents/me/bookings'),
};

// Parent Profile API
export const parentProfileAPI = {
  getProfile: () => api.get('/parents/me/profile'),
  updateProfile: (data) => api.put('/parents/me/profile', data),
};

// Parent Climbers API
export const parentClimbersAPI = {
  getAll: () => api.get('/parents/me/climbers'),
  create: (data) => api.post('/parents/me/climbers', data),
  update: (id, data) => api.put(`/parents/me/climbers/${id}`, data),
  deactivate: (id) => api.delete(`/parents/me/climbers/${id}`),
  linkExisting: (childId) => api.post(`/parents/me/climbers/${childId}/link-existing`),
  checkDeletion: (id) => api.get(`/parents/me/climbers/${id}/check-deletion`),
};

// My Climber API (self-managed climber)
export const myClimberAPI = {
  getProfile: () => api.get('/me/climber'),
  createProfile: (data) => api.post('/me/climber', data),
  updateProfile: (data) => api.put('/me/climber', data),
};

// Attendance API
export const attendanceAPI = {
  record: (data) => api.post('/attendance', data),
  getForSession: (sessionId) => api.get(`/attendance/session/${sessionId}`),
};

// Coach Sessions API
export const coachSessionsAPI = {
  getTodaysSessions: () => api.get('/coaches/me/sessions/today'),
  getRoster: (sessionId) => api.get(`/coaches/me/sessions/${sessionId}/roster`),
};

// Admin Users API
export const adminUsersAPI = {
  getAll: (params) => api.get('/admin/users', { params }),
  getById: (id) => api.get(`/admin/users/${id}`),
  update: (id, data) => api.put(`/admin/users/${id}`, data),
  updateRoles: (id, roles) => api.put(`/admin/users/${id}/roles`, { roles }),
  getCoaches: () => api.get('/admin/users?role=coach'),
};

// Climber Photos API
export const climberPhotosAPI = {
  upload: (climberId, file) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post(`/admin/climbers/${climberId}/photos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  delete: (climberId, filename) => api.delete(`/admin/climbers/${climberId}/photos/${filename}`),
  setMain: (climberId, filename) => api.put(`/admin/climbers/${climberId}/photos/${filename}/set-main`),
  getPhotoUrl: (climberId, filename) => {
    const token = localStorage.getItem('token');
    return `${API_BASE_URL}/admin/photos/${climberId}/${filename}${token ? `?token=${token}` : ''}`;
  },
};

// Competitions API
export const competitionsAPI = {
  // Public endpoints (no authentication required)
  getCompetitions: (params) => api.get('/competitions', { params }),
  getCompetition: (id) => api.get(`/competitions/${id}`),

  // Admin endpoints (require authentication)
  getCompetitionsAdmin: (params) => api.get('/admin/competitions', { params }),
  getCompetitionAdmin: (id) => api.get(`/admin/competitions/${id}`),
  previewImport: () => api.post('/admin/competitions/import/preview'),
  importCompetitions: (competitions) => api.post('/admin/competitions/import', { competitions }),
  updateCompetition: (id, data) => api.put(`/admin/competitions/${id}`, data),
  deleteCompetition: (id) => api.delete(`/admin/competitions/${id}`),
};

export default api;
