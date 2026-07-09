import api from './axios';

const BASE = '/api/clients';

export const clientApi = {
  getAll: (params) => api.get(BASE, { params }),
  getById: (id) => api.get(`${BASE}/${id}`),
  create: (data) => api.post(BASE, data),
  update: (id, data) => api.put(`${BASE}/${id}`, data),
  delete: (id) => api.delete(`${BASE}/${id}`),
};
