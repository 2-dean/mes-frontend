import { useCallback, useRef } from 'react';

/**
 * 같은 화면 내 여러 그리드의 미저장 상태를 관리합니다.
 * 다른 그리드에 미저장 데이터가 있을 때 클릭을 가로채 확인창을 보여줍니다.
 *
 * @param {number} count - 관리할 그리드 수
 * @returns {{ setDirty, makeGuard }}
 *   setDirty(index, bool) - 해당 그리드의 dirty 상태 업데이트
 *   makeGuard(index) - 그리드 컨테이너 div의 onMouseDownCapture 핸들러 생성
 */
export function useMultiGridDirty(count) {
  const dirtyRef = useRef(new Array(count).fill(false));

  const setDirty = useCallback((index, value) => {
    dirtyRef.current[index] = value;
  }, []);

  const makeGuard = useCallback((selfIndex) => (e) => {
    const hasOtherDirty = dirtyRef.current.some((d, i) => i !== selfIndex && d);
    if (hasOtherDirty) {
      if (!window.confirm('저장하지 않은 데이터가 있습니다. 이동하시겠습니까?')) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }, []);

  return { setDirty, makeGuard };
}
