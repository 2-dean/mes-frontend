import api from './axios';

const BASE = '/api/daily-close';

export const dailyCloseApi = {
  getAll: () => api.get(BASE),
  close: (data) => api.post(BASE, data),
  cancel: (data) => api.delete(BASE, { data }),
};
