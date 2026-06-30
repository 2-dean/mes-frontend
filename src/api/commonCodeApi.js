import api from './axios';

export const commonCodeApi = {
  getGroups: () => api.get('/api/code-groups'),
  createGroup: (data) => api.post('/api/code-groups', data),
  updateGroup: (id, data) => api.put(`/api/code-groups/${id}`, data),
  deleteGroup: (id) => api.delete(`/api/code-groups/${id}`),

  getCodes: (groupId) => api.get(`/api/code-groups/${groupId}/codes`),
  createCode: (groupId, data) => api.post(`/api/code-groups/${groupId}/codes`, data),
  updateCode: (id, data) => api.put(`/api/codes/${id}`, data),
  deleteCode: (id) => api.delete(`/api/codes/${id}`),
};
