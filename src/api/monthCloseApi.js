import api from './axios';

const BASE = '/api/month-close';

export const monthCloseApi = {
  getAll: () => api.get(BASE),
  close: (data) => api.post(BASE, data),
  cancel: (data) => api.delete(BASE, { data }),
};
