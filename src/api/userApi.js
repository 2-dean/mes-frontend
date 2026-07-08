import api from './axios';

const BASE = '/api/users';

export const userApi = {
  getAll: () => api.get(BASE),
  create: (data) => api.post(BASE, data),
  update: (id, data) => api.put(`${BASE}/${id}`, data),
  changePassword: (id, data) => api.put(`${BASE}/${id}/password`, data),

  // 작업자 선택 팝업용 (활성 사용자 최소정보, 전 권한 조회 가능)
  getSimple: () => api.get(`${BASE}/simple`),
};
