/**
 * F0 공통 API 함수 — F0 design §9.1·9.2·9.3
 *
 * 화면은 경로 문자열을 몰라야 한다. 이 파일이 경로와 화면 사이의 유일한 통로다.
 * 경로 상수는 §9 계약과 글자 그대로 같다 — 문서에서 grep 한 값이 코드에서도 찾아진다.
 */
import { post } from './http'

export const COMMON_API = {
  DEPT_LIST: '/api/common/dept-list',
  PROCESS_TREE: '/api/common/process-tree',
  USER_LIST: '/api/common/user-list'
}

/**
 * §9.1 부서 목록.
 * @param {'Y'|'N'} [useYn] 생략 시 전체
 * @returns {Promise<Array<{deptCd, deptNm, parentDeptCd, sortNo, useYn}>>}
 */
export const fetchDeptList = (useYn) => post(COMMON_API.DEPT_LIST, { useYn })

/**
 * §9.2 공정 트리 — **평면 배열**을 반환한다. 트리 조립은 화면이 한다.
 * @param {'Y'|'N'} [useYn] 생략 시 전체
 * @returns {Promise<Array<{procCd, procNm, parentProcCd, sortNo, useYn}>>}
 */
export const fetchProcessTree = (useYn) => post(COMMON_API.PROCESS_TREE, { useYn })

/**
 * §9.3 사용자 목록 (D34) — F2 `검사자 ▼` · F3 `발행자` 의 후보 목록.
 * Sprint-1 은 Mock 고정 목록이고, `MST_USER` 테이블과 로그인은 Sprint-2 다.
 * @param {'Y'|'N'} [useYn] 생략 시 전체
 * @returns {Promise<Array<{userId, userNm, deptCd, deptNm, useYn}>>}
 */
export const fetchUserList = (useYn) => post(COMMON_API.USER_LIST, { useYn })

/**
 * 평면 배열 → q-tree 노드 트리.
 *
 * §9.2 가 평면으로 주는 이유는 서버가 화면 형태를 모르게 하기 위해서다.
 * 그래서 조립은 여기(프론트)서 한다. `MultiTreeCombo` 가 이 결과를 받는다.
 *
 * @param {Array} rows       평면 행 배열
 * @param {string} codeKey   코드 키 (`procCd`)
 * @param {string} nameKey   명칭 키 (`procNm`)
 * @param {string} parentKey 부모 코드 키 (`parentProcCd`) — 최상위는 null
 */
export function toTree(rows, codeKey, nameKey, parentKey) {
  const byCode = new Map()
  const roots = []

  // 1단계: 전 행을 노드로 만들어 색인한다. 부모가 자식보다 뒤에 와도 안전하다.
  for (const row of rows) {
    byCode.set(row[codeKey], {
      label: row[nameKey],
      code: row[codeKey],
      sortNo: row.sortNo,
      children: []
    })
  }

  // 2단계: 부모에 붙인다. 부모가 목록에 없으면(useYn 필터로 잘렸을 때) 루트로 올린다.
  for (const row of rows) {
    const node = byCode.get(row[codeKey])
    const parent = row[parentKey] ? byCode.get(row[parentKey]) : null
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  // 3단계: 형제끼리 sortNo 순. 서버가 준 순서를 화면이 뒤집지 않도록 명시적으로 정렬한다.
  const sortRec = (nodes) => {
    nodes.sort((a, b) => a.sortNo - b.sortNo)
    for (const n of nodes) if (n.children.length) sortRec(n.children)
  }
  sortRec(roots)

  return roots
}
