import api from './axios';

const BASE = '/api/workorders';

export const workOrderApi = {
  getAll: (params) => api.get(BASE, { params }),
  getById: (id) => api.get(`${BASE}/${id}`),
  create: (data) => api.post(BASE, data),
  update: (id, data) => api.put(`${BASE}/${id}`, data),
  confirm: (id) => api.patch(`${BASE}/${id}/confirm`),
  cancelConfirm: (id) => api.patch(`${BASE}/${id}/cancel-confirm`),
  delete: (id) => api.delete(`${BASE}/${id}`),
};
