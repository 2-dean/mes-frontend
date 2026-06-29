import api from './axios';

const BASE = '/api/prod-incentives';

export const prodIncentiveApi = {
  getAll: () => api.get(BASE),
  getByWorkOrderId: (workOrderId) => api.get(`${BASE}/work-order/${workOrderId}`),
};
