import api from './axios';

const BASE = '/api/users';

export const userApi = {
  getAll: () => api.get(BASE),
  create: (data) => api.post(BASE, data),
  update: (id, data) => api.put(`${BASE}/${id}`, data),
  changePassword: (id, data) => api.put(`${BASE}/${id}/password`, data),
};
