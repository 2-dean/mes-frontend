import api from './axios';

const BASE = '/api/prod-results';

export const prodResultApi = {
  getAll: () => api.get(BASE),
  getByWorkOrderId: (workOrderId) => api.get(`${BASE}/${workOrderId}`),
  scan: (data) => api.post(`${BASE}/scan`, data),
  manual: (data) => api.post(`${BASE}/manual`, data),
  delete: (id) => api.delete(`${BASE}/${id}`),
};
