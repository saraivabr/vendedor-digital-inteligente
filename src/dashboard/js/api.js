/**
 * API Client for CRM Dashboard
 */

const API = {
    baseUrl: '/api',
    token: null,

    // Initialize with token from localStorage
    init() {
        this.token = localStorage.getItem('crm_token');
        return this.token !== null;
    },

    // Set authentication token
    setToken(token) {
        this.token = token;
        localStorage.setItem('crm_token', token);
    },

    // Clear token (logout)
    clearToken() {
        this.token = null;
        localStorage.removeItem('crm_token');
    },

    // Make API request
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    this.clearToken();
                    window.location.reload();
                }
                throw new Error(data.error || 'Erro na requisição');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // GET request
    get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url);
    },

    // POST request
    post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // PUT request
    put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    // DELETE request
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },

    // Auth endpoints
    auth: {
        login: (email, password) => API.post('/auth/login', { email, password }),
        logout: () => API.post('/auth/logout'),
        me: () => API.get('/auth/me'),
        changePassword: (currentPassword, newPassword) =>
            API.post('/auth/change-password', { currentPassword, newPassword })
    },

    // Contacts endpoints
    contacts: {
        list: (params) => API.get('/contacts', params),
        get: (id) => API.get(`/contacts/${id}`),
        create: (data) => API.post('/contacts', data),
        update: (id, data) => API.put(`/contacts/${id}`, data),
        delete: (id) => API.delete(`/contacts/${id}`),
        timeline: (id) => API.get(`/contacts/${id}/timeline`),
        deals: (id) => API.get(`/contacts/${id}/deals`),
        stats: () => API.get('/contacts/stats')
    },

    // Deals endpoints
    deals: {
        list: (params) => API.get('/deals', params),
        get: (id) => API.get(`/deals/${id}`),
        create: (data) => API.post('/deals', data),
        update: (id, data) => API.put(`/deals/${id}`, data),
        delete: (id) => API.delete(`/deals/${id}`),
        kanban: (pipeline) => API.get('/deals/kanban', { pipeline }),
        moveToStage: (id, stage) => API.put(`/deals/${id}/stage`, { stage }),
        markWon: (id, reason) => API.put(`/deals/${id}/won`, { reason }),
        markLost: (id, reason) => API.put(`/deals/${id}/lost`, { reason }),
        stats: () => API.get('/deals/stats')
    },

    // Tasks endpoints
    tasks: {
        list: (params) => API.get('/tasks', params),
        get: (id) => API.get(`/tasks/${id}`),
        create: (data) => API.post('/tasks', data),
        update: (id, data) => API.put(`/tasks/${id}`, data),
        delete: (id) => API.delete(`/tasks/${id}`),
        complete: (id) => API.put(`/tasks/${id}/complete`),
        overdue: () => API.get('/tasks/overdue'),
        today: () => API.get('/tasks/today'),
        stats: () => API.get('/tasks/stats')
    },

    // Activities endpoints
    activities: {
        list: (params) => API.get('/activities', params),
        log: (data) => API.post('/activities', data),
        stats: (period) => API.get('/activities/stats', { period })
    },

    // Pipeline endpoints
    pipeline: {
        get: (pipeline) => API.get('/pipeline', { pipeline }),
        summary: (pipeline) => API.get('/pipeline/summary', { pipeline })
    },

    // Metrics endpoints
    metrics: {
        dashboard: () => API.get('/metrics/dashboard'),
        funnel: (pipeline) => API.get('/metrics/funnel', { pipeline }),
        revenue: (pipeline) => API.get('/metrics/revenue', { pipeline }),
        activity: (days) => API.get('/metrics/activity', { days }),
        daily: (days) => API.get('/metrics/daily', { days }),
        performance: (days) => API.get('/metrics/performance', { days }),
        lostReasons: (days) => API.get('/metrics/lost-reasons', { days })
    },

    // Tags endpoints
    tags: {
        list: (category) => API.get('/tags', { category }),
        create: (data) => API.post('/tags', data),
        suggest: (content) => API.get('/tags/suggest', { content })
    }
};
