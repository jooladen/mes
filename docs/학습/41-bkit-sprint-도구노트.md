# bkit Sprint 학습노트

> 준이 MES 프로젝트를 하면서 실제로 겪은 것을 정리한 문서.
> 다음 프로젝트에서 혼자 스프린트를 돌릴 때 이것만 보면 된다.
> **진행하면서 계속 추가한다.**

작성 시작: 2026-09-04 · 대상 스프린트: `mes-coa-s1`

---

## 1. 한 줄 정의

> **bkit Sprint = 기능 여러 개를 한 세트로 묶어, 8칸짜리 검문소를 통과시키는 작업 폴더**

애자일 스프린트와 이름만 같고 다른 물건이다. §7 비교표 참조.

---

## 2. 8칸 지도

```
 ①prd ─ ②plan ─ ③design ─ ④do ─ ⑤iterate ─ ⑥qa ─ ⑦report ─ ⑧archived
  왜      무엇      어떻게    코딩    자동수정    검증    보고서     봉인
```

| 칸 | 하는 일 | 산출물 |
|---|---|---|
| `prd` | 왜/누구를 위해 | PRD (마스터플랜이 대신할 수 있음) |
| `plan` | **무엇을** 만들지 (WHAT) | feature별 Plan 문서 |
| `design` | **어떻게** 만들지 (HOW) | feature별 Design 문서 + 데이터 모델 |
| `do` | 코딩 | 소스 코드 |
| `iterate` | 설계↔코드 어긋난 만큼 자동 수정 | matchRate 100% |
| `qa` | 데이터가 UI→API→DB→UI 7구간 흐르는지 | S1 100% |
| `report` | 결과·배운 것·못 한 것 | 완료 보고서 |
| `archived` | 읽기전용 봉인 | — |

---

## 3. ⚠️ 가장 중요한 오해 — `phase` 는 문서를 만들지 않는다

```
/sprint phase <id> --to plan     →  ✅ ok: true,  phase: "plan"
docs/ 확인                        →  ❌ 아무 파일도 없음
```

🟢 **`phase` 는 책갈피를 옮기는 것**이지 페이지를 쓰는 게 아니다.
🔵 `phase` 는 **순수 상태 전이(state transition)** 다. 문서 생성은 별개 작업이고, 사람 또는 AI가 직접 해야 한다.

**대시보드가 `phase: plan` 이라고 해도 Plan 문서가 있다는 뜻이 아니다.**

이걸 모르면 "성공했다는데 아무것도 없네?"가 반복된다.

### 습관 하나

bkit 명령을 친 뒤에는 항상 물어볼 것:

> **"그래서 파일 뭐 생겼어?"**

---

## 4. 게이트 (검문소)

🟢 놀이기구 앞의 **키 재는 막대**. 안 되면 못 탄다. 떼써도 소용없다.
🔵 각 phase 전이의 사전조건. 미충족 시 `{ ok:false, reason:'gate_fail' }` 로 거부된다.

### 실제로 만난 게이트

| 코드 | 재는 것 | 언제 | 통과선 | 담당 에이전트 |
|---|---|---|:---:|---|
| **M8** | 문서가 다음 단계 갈 준비가 됐나 | plan→design, design→do | 85 | `sprint-orchestrator` |
| **M4** | API 계약이 앞뒤가 맞나 | design→do | **95** | `gap-detector` |

**M4가 더 빡빡한 이유**: 계약이 틀린 채 코딩하면 프론트와 백엔드가 다른 걸 만든다. 문서는 고치면 되지만 코드는 다시 짜야 한다.

### 게이트 측정은 CLI로 안 된다

```bash
node scripts/sprint-handler.js measure <id> --gate M8
→ { ok: false, reason: "no_agent_runner" }
```

측정은 **에이전트를 띄워야** 한다. CLI는 별도 프로세스라 Task 도구를 못 본다.

### `--approve` 는 게이트를 못 넘는다

| 상황 | `--approve` | 해결 |
|---|:---:|---|
| Trust 경계에 막힘 (`requires_user_approval`) | ✅ 넘어감 | `--approve --reason "..."` |
| **게이트 실패** (`gate_fail`) | ❌ **안 넘어감** | 결함을 고치고 재측정 |

`--approve` 는 **신뢰수준 경계**만 여는 열쇠다. 품질 게이트는 못 연다.

---

## 5. Trust 레벨 — 가장 중요한 설정

| 레벨 | 어디까지 자동 | 언제 쓰나 |
|---|---|---|
| L0/L1 | `prd` 까지 | 한 걸음마다 확인. 게이트가 preview 모드라 기록도 안 됨 (주의) |
| **L2** | `design` 까지 | **학습 목적. 코딩 전에 멈춤** ← MES에서 선택 |
| L3 | `report` 까지 | 익숙해진 뒤. 코드가 한 번에 쏟아짐 |
| L4 | `archived` 까지 | 완전 자동 |

**학습이 목적이면 L2.** 코드가 자동으로 쏟아지면 문법을 볼 시간이 없다.

나중에 올리기: `/sprint trust <id> --to L3 --reason "..."`

---

## 6. 안전핀 4개 (Auto-Pause)

자동 진행 중 아래에 걸리면 **스스로 멈춘다.**

| 안전핀 | 조건 | 비유 |
|---|---|---|
| `QUALITY_GATE_FAIL` | M3 > 0 또는 S1 < 100 | 가스 냄새 나면 불 끔 |
| `ITERATION_EXHAUSTED` | 5번 고쳐도 안 맞음 | 5번 다시 끓였는데 계속 짜면 손 뗌 |
| `BUDGET_EXCEEDED` | 토큰 초과 | 장 볼 돈 다 씀 |
| `PHASE_TIMEOUT` | 한 칸이 너무 오래 | 3시간째 안 익음 |

**"자동"이라고 폭주하지 않는다.**

---

## 7. 애자일 스프린트 vs bkit 스프린트

| | 애자일 | bkit |
|---|---|---|
| **고정되는 것** | 🔒 시간 (2주) | 🔒 품질 (게이트) |
| **조절되는 것** | 할 일 범위 | 걸리는 시간 |
| **끝나는 조건** | 날짜가 됨 | 검사 다 통과 |
| **안쪽 절차** | 자유 (빈 상자) | 8단계 강제 (상태 머신) |
| **참여자** | 팀 (PO/SM/개발자) | 1인 + AI |
| **회고** | 사람이 모여서 | `report` 자동 생성 |

같은 점: 여러 일을 한 묶음으로 관리 / 끝나면 결과물+회고 / 못 끝낸 건 다음으로 이월(carry items)

> bkit 문서 스스로도 *"Sprint = **meta-container** above PDCA"* 라고 정의한다. 익숙한 단어를 빌려 쓴 것뿐이다.

---

## 8. 명령어 치트시트

```bash
# ── 시작 ──────────────────────────────
/sprint master-plan <프로젝트> --name "..." --features a,b,c
/sprint init <스프린트id> --name "..." --trust L2

# ── 조회 ──────────────────────────────
/sprint status <id>          # 지금 어디?
/sprint list                 # 뭐가 있지?

# ── 진행 ──────────────────────────────
/sprint phase <id> --to <칸>          # 커서 이동 (문서는 따로!)
/sprint measure <id> --gate M8        # 게이트 채점 (에이전트 필요)

# ── 막혔을 때 ─────────────────────────
/sprint phase <id> --to <칸> --approve --reason "..."   # 신뢰경계만 통과
/sprint trust <id> --to L3 --reason "..."               # 신뢰수준 영구 상향
/sprint pause <id>  /  resume <id>

# ── 마무리 ────────────────────────────
/sprint report <id>
/sprint archive <id>
```

---

## 9. 실전 로그 — MES 프로젝트에서 실제로 일어난 일

| # | 친 명령 / 한 일 | 결과 | 배운 것 |
|---|---|---|---|
| 1 | `master-plan mes-coa` | ✅ | 지도부터. 여러 스프린트를 담는 상위 계획 |
| 2 | `init mes-coa-s1 --trust L2` | ✅ | `init` 은 **공책 사기**. 아무것도 안 만들어짐 |
| 3 | `phase --to plan` | ✅ | **커서만 이동.** 문서 0개 ← §3 |
| 4 | Plan 문서 5개 작성 | — | **칸 안의 일은 사람/AI가 한다** |
| 5 | `phase --to design` | ❌ M8 | 첫 게이트. 문서 없이 넘어가려다 막힘 |
| 6 | `measure --gate M8` (CLI) | ❌ | `no_agent_runner` — CLI로는 측정 불가 |
| 7 | 에이전트로 M8 측정 | ✅ **86** | 진짜 구멍 3건 지적 (종합판정 저장 위치 / 고객사 입력 경로 / 테이블 소유자) |
| 8 | `phase --to design` 재시도 | ✅ | 게이트 열림 |
| 9 | 데이터 모델 + Design 6개 작성 | — | 테이블 8→9개 (`TRN_COA_DETAIL` 추가) |
| 10 | `phase --to do` | ❌ M4 | |
| 11 | 에이전트로 M4 측정 | ❌ **60**/95 | **결함 20건.** §10 참조 |

---

## 10. M4에서 배운 것 — 자가진단은 후해진다

Design 문서 §14에 이런 체크박스를 내가 직접 찍었다.

```
- [x] API 계약이 Request/Response 키·타입·Null 여부까지 명시되었다
```

**사실이 아니었다.** 13개 API 중 계약이 완전한 건 2개뿐이었다.

> 🎯 **자기가 자기를 채점하면 후해진다. 그래서 외부 게이트가 있다.**

만약 게이트 없이 "다 됐어?" 하고 물었으면 "네" 라는 답을 들었을 것이다. 그리고 계약이 어긋난 채로 코딩에 들어갔을 것이다.

### M4가 잡아낸 대표 결함

| 유형 | 예 | 왜 위험 |
|---|---|---|
| **문서 내부 모순** | `JUDGE_RESULT` 가 §3.7은 `PASS/FAIL`, §4.2는 `NONE/PASS/FAIL` | "NONE을 DB에 저장하나?"가 미정의 |
| **같은 키, 다른 뜻** | 한 응답 안에 `unitCd` 가 둘 — 재고단위(`EA`)와 측정단위(`MPa`) | 코딩할 때 100% 섞임 |
| **이름이 바뀌는데 규칙 없음** | F1 `sortNo` → F3 `printSeq` → F4 다시 `sortNo` | 두 사람이 다른 걸 만듦 |
| **개수 불일치** | 마스터플랜 "API 9개" vs 실제 13개 | 순차로 쓰면서 늘려놓고 다시 안 셈 |

---

## 11. 에이전트에게 채점 시킬 때의 요령

M8·M4 측정이 유용했던 이유는 프롬프트에 이걸 넣었기 때문이다.

```
Be strict and honest. Do not inflate the score.
If something is missing, say so with the file and section.
```

**"후하게 보지 말고, 없으면 없다고 해"** 를 안 넣으면 95점 주고 그냥 통과시킨다.

추가로 효과가 컸던 것:

1. **평가 대상을 재정의해주기** — "코드가 없으니 §9↔§10↔데이터모델 3자 대조로 해라"
2. **기준을 번호로 쪼개기** — 8개 기준 각각에 판정 방법을 붙임
3. **구체 예시 주기** — "feature 간 키 일치를 봐라: `totalJudge`, `sortNo→printSeq`, `judgeResult`"

3번 덕분에 `printSeq` 매핑 미정의를 정확히 겨냥했다.

---

## 12. 다음에 이 순서로 하면 된다

```
1. /sprint master-plan          지도 그리기
2. /sprint init --trust L2      공책 사기
3. Plan 문서 작성                ← 손으로 (또는 AI에게)
4. /sprint phase --to design    → M8 막히면 measure
5. Design 문서 작성              ← §9 API 계약을 처음부터 표로!
6. /sprint phase --to do        → M4 막히면 measure
7. 코딩
8. /sprint phase --to qa / report / archive
```

**5번에서 시간을 아끼려 하지 말 것.** §9 응답 키 표를 처음부터 제대로 쓰면 M4에서 20건을 고치는 일이 없다.

---

## Version History

| 버전 | 일자 | 변경 |
|---|---|---|
| 0.1 | 2026-09-04 | 최초 작성. `phase`≠문서생성 / 게이트 / Trust / M4 교훈 |
