// 백엔드 GlobalExceptionHandler가 내려주는 에러 응답에서 사용자에게 보여줄 메시지를 뽑아낸다.
// - @Valid 검증 실패: { 필드명: 에러메시지, ... } 형태
// - 그 외 RuntimeException: { message: "..." } 형태
export function errorMessage(e, fallback) {
  const data = e?.response?.data;
  if (data && typeof data.message === 'string') return data.message;
  if (data && typeof data === 'object') {
    const first = Object.values(data).find((v) => typeof v === 'string');
    if (first) return first;
  }
  return fallback;
}
