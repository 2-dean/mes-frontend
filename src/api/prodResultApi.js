import api from './axios';

const BASE = '/api/prod-results';

export const prodResultApi = {
  getAll: () => api.get(BASE),
  getByWorkOrderId: (workOrderId) => api.get(`${BASE}/${workOrderId}`),
  search: (params) => api.get(BASE, { params }),
  scan: (data) => api.post(`${BASE}/scan`, data),
  manual: (data) => api.post(`${BASE}/manual`, data),
  updateManualQty: (id, manualQty) => api.patch(`${BASE}/${id}/manual-qty`, { manualQty }),
  delete: (id) => api.delete(`${BASE}/${id}`),
};
