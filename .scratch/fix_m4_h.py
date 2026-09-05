# -*- coding: utf-8 -*-
"""M4 8차 - R6~R10 + 잔여 6건"""
import io, os, sys, glob, re

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = r"C:/Users/jooladen/Desktop/claude-code2/cdp2/mes"


def fix(rel, edits, tag):
    path = os.path.join(ROOT, rel)
    s = io.open(path, encoding="utf-8").read()
    miss = []
    for i, (old, new) in enumerate(edits):
        if old not in s:
            miss.append(i)
            continue
        s = s.replace(old, new, 1)
    io.open(path, "w", encoding="utf-8").write(s)
    print(("OK  " if not miss else "PART miss=" + str(miss)) + ": " + tag)


# ================= 1) F0 에러 레지스트리 정합화 (R6·R7·R8·R10) =================
fix("docs/02-design/F0-common-core.design.md", [
    # R10 - 제목/도입문
    ("### 8.1.1 에러코드 레지스트리 (스프린트 전역 — N18)\n\n"
     "> 22개 코드가 5개 문서에 흩어져 있어 중복·오타를 막을 수단이 없었다. **여기가 단일 목록이다.**",
     "### 8.1.1 에러코드 레지스트리 (스프린트 전역 — N19b)\n\n"
     "> 에러코드가 5개 문서에 흩어져 있어 중복·오타를 막을 수단이 없었다. **여기가 단일 목록이다.**"),
    # R6 - INSP_ITEM_DUPLICATED 소유 병기
    ("| `INSP_ITEM_DUPLICATED` | 400 | F1 | 행 | 같은 품목 내 검사항목 중복 |",
     "| `INSP_ITEM_DUPLICATED` | 400 | **F1·F2** | 행 | F1: 같은 품목 내 검사항목 중복 / F2: 한 요청 `resultList` 내 `inspItemCd` 중복 |"),
    # 4) 필수 파라미터 누락 코드 5종 신설
    ("| `MEASURED_VAL_REQUIRED` | 400 | F2 | 행 | `measuredVal` 이 null |",
     "| `MEASURED_VAL_REQUIRED` | 400 | F2 | 행 | `measuredVal` 이 null |\n"
     "| `INSP_USER_REQUIRED` | 400 | F2 | 요청 | `inspUserId` 누락 |"),
    ("| `CUST_NM_REQUIRED` | 400 | F3 | 요청 | 고객사명 누락 |",
     "| `CUST_NM_REQUIRED` | 400 | F3 | 요청 | 고객사명 누락 |\n"
     "| `SHIP_QTY_REQUIRED` | 400 | F3 | 요청 | `shipQty` 누락 |\n"
     "| `ISSUE_USER_REQUIRED` | 400 | F3 | 요청 | `issueUserId` 누락 |"),
    ("| `INVALID_DECIMAL_LEN` | 400 | F1 | 행 | `decimalLen` 이 0~6 밖 |",
     "| `INVALID_DECIMAL_LEN` | 400 | F1 | 행 | `decimalLen` 이 0~6 밖 |\n"
     "| `INVALID_YN_FLAG` | 400 | F1 | 행 | `useYn` 이 `Y`/`N` 밖 (V10) |"),
    ("| `COA_NOT_FOUND` | 400 | F3 | 요청 | 존재하지 않는 성적서 번호 |",
     "| `COA_NOT_FOUND` | 400 | F3 | 요청 | 존재하지 않는 성적서 번호. **`coaNo` 누락도 이 코드로 흡수** |"),
    # R7 - errors[] 보조 키 확장 규칙
    ("`errors` 는 **선택 키**다. 이 스키마의 소유자는 F0의 `GlobalExceptionHandler` 이며, F1~F4는 여기 정의된 형태만 사용한다.",
     "`errors` 는 **선택 키**다. 이 스키마의 소유자는 F0의 `GlobalExceptionHandler` 다.\n\n"
     "> **보조 표시 키 확장 규칙 (R7)**: `rowIndex`·`field`·`code`·`message` 4종은 **필수**이며 이름·의미를 바꿀 수 없다. "
     "그 외 보조 표시 키(`sortNo`, `inspItemCd` 등)는 **해당 feature가 자신의 §9 계약에 명시적으로 선언한 것에 한해** 추가할 수 있다. "
     "보조 키는 사용자 표시용이며, **행 식별에는 언제나 `rowIndex` 만 쓴다.**"),
    # R8 - §9.3 예시 정정
    ("단순 오류 — HTTP 400\n"
     "```json\n"
     '{ "errorCode": "VALIDATION_FAILED", "errorMessage": "부서코드는 필수입니다." }\n'
     "```",
     "요청 단위 오류 — HTTP 400. **`errors[]` 없음** (§8.1.1 요청 단위 코드)\n"
     "```json\n"
     '{ "errorCode": "ITEM_REQUIRED", "errorMessage": "품목코드는 필수입니다." }\n'
     "```\n"
     "> F0 자신의 §9.1·§9.2는 에러가 없다(결과 0건 = 빈 배열). 위는 F1 §9.2의 요청 단위 오류를 예시로 든 것이다."),
    # 6) 성공 상태코드
    ("| 서버 오류 | **500** | `INTERNAL_ERROR` |",
     "| 서버 오류 | **500** | `INTERNAL_ERROR` |\n\n"
     "**정상 응답은 항상 `200`** 이며 본문은 §4.1대로 래핑하지 않는다. `201`·`204` 를 쓰지 않는다 — 모든 API가 POST이고 "
     "생성/조회를 상태코드로 구분하지 않기 때문이다."),
    ("| 0.4 | 2026-09-04 | M4 4차 반영 — 에러코드 레지스트리 24종 신설(§8.1.1). 5개 문서 분산 해소 |",
     "| 0.4 | 2026-09-04 | M4 4차 반영 — 에러코드 레지스트리 신설(§8.1.1). 5개 문서 분산 해소 |\n"
     "| 0.5 | 2026-09-04 | M4 5차 반영 — R6 `INSP_ITEM_DUPLICATED` 소유 F1·F2 병기, R7 `errors[]` 보조 키 확장 규칙, "
     "R8 §9.3 예시 요청 단위로 정정, R10 제목/도입문 정정, 필수 파라미터 코드 5종 신설, 성공 상태코드 200 명시 |"),
], "1) F0 레지스트리 (R6·R7·R8·R10)")

# ================= 2) data-model 응답 키 노출 범위 =================
fix("docs/02-design/mes-coa-s1.data-model.md", [
    ("- **응답 키**: `lotNo`, `parentLotNo`, `itemCd`, `woNo`, `procCd`, `goodQty`, `scrapQty`, `lotStatus`, `totalJudge`, `judgeDt`, `regDt`",
     "- **응답 키**: `lotNo`, `itemCd`, `procCd`, `goodQty`, `scrapQty`, `lotStatus`, `totalJudge`, `judgeDt`\n"
     "- **Sprint-1 미노출**: `parentLotNo`·`woNo` (Sprint-2 F5·F7이 사용), `regDt` (화면 요구 없음)"),
    ("- **인덱스**: `(LOT_NO, INSP_ITEM_CD, LATEST_YN)`\n"
     "- **응답 키**: `inspSeq`, `lotNo`, `inspItemCd`, `measuredVal`, `judgeResult`, `inspDt`, `inspUserId`, `latestYn`, `remark`",
     "- **인덱스**: `(LOT_NO, INSP_ITEM_CD, LATEST_YN)`\n"
     "- **응답 키**: `inspSeq`, `inspItemCd`, `measuredVal`, `judgeResult`, `inspDt`, `inspUserId`, `remark`\n"
     "- **Sprint-1 미노출**: `latestYn` — **필터 조건일 뿐** 응답에 싣지 않는다. 모든 조회가 `LATEST_YN='Y'` 로 고정이라 "
     "값이 항상 같아 정보량이 0이다\n"
     "- `lotNo` 는 **헤더 레벨 키**다. F2 §9.2 `inspList[]` / §9.3 `resultList[]` 원소에는 반복하지 않는다 "
     "(F4 §9.1 `detailList[]` 는 여러 Lot을 섞으므로 예외적으로 원소에 싣는다)"),
    ("- **응답 키**: `coaNo`, `printSeq`, `inspItemCd`, `inspItemNm`, `unitCd`, `judgeType`, `lsl`, `usl`, `decimalLen`, `measuredVal`, `judgeResult`",
     "- **응답 키**: `printSeq`, `inspItemCd`, `inspItemNm`, `unitCd`, `judgeType`, `lsl`, `usl`, `decimalLen`, `measuredVal`, `judgeResult` (10종)\n"
     "- `coaNo` 는 **헤더 레벨 키**다. `detailList[]` 원소에 반복하지 않는다 (F3 design §9.3·§9.4 \"detail 10키\")"),
    ("| 0.6 | 2026-09-04 | M4 4차 반영 — N10 §8 채번 참조 §4.4→§4.6, N11 `TRN_COA` 응답 키 선언, N18 §4.1~4.3 상수 소유 선언 |",
     "| 0.6 | 2026-09-04 | M4 4차 반영 — N10 §8 채번 참조 §4.4→§4.6, N11 `TRN_COA` 응답 키 선언, N18 §4.1~4.3 상수 소유 선언 |\n"
     "| 0.7 | 2026-09-04 | M4 5차 반영 — §3.6·§3.7·§3.9 응답 키 노출 범위 명시(미노출 컬럼·헤더/원소 레벨 구분), N16 문서 수식 참조 |"),
    # 5) N16 문서 수식 참조
    ("상수 소유: **`WoStatus`** · **`YnFlag`** (F0 §10)", "상수 소유: **`WoStatus`** · **`YnFlag`** (F0 design §10)"),
    ("상수 소유: **`CoaStatus`** (F3 §10)", "상수 소유: **`CoaStatus`** (F3 design §10)"),
    ("F1 §8 전역 명명 규칙", "F1 design §8 전역 명명 규칙"),
], "2) data-model 노출 범위 + N16")

# ================= 3) master-plan §2 표 복구 + 상태 동기 (R9) =================
fix("docs/01-plan/features/mes-coa.master-plan.md", [
    ("| 0 | `F0-common-core` | ✅design | 공통 뼈대", "| 0 | `F0-common-core` | 공통 뼈대"),
    ("Axios 공통 클라이언트, 공통 콤보 3종(`CodeSelect` / `MultiCheckCombo` / `MultiTreeCombo`) | **P0** | — | pending |",
     "Axios 공통 클라이언트, 공통 콤보 3종(`CodeSelect` / `MultiCheckCombo` / `MultiTreeCombo`) | **P0** | — | **design** |"),
    ("| 1 | `F1-quality-spec` | 품목별 검사 Spec 관리 (검사항목·단위·USL/LSL·판정방식 CRUD) | P0 | F0 | pending |",
     "| 1 | `F1-quality-spec` | 품목별 검사 Spec 관리 (검사항목·단위·USL/LSL·판정방식 CRUD) | P0 | F0 | **design** |"),
    ("이탈 시 Alert/Locking (Quasar POP UI) | P0 | F1 | pending |",
     "이탈 시 Alert/Locking (Quasar POP UI) | P0 | F1 | **design** |"),
    ("| 3 | `F3-coa-print` | **CoA 자동 생성 + 인쇄/PDF** — 본 스프린트의 최종 Output | **P0** | F2 | pending |",
     "| 3 | `F3-coa-print` | **CoA 자동 생성 + 인쇄/PDF** — 본 스프린트의 최종 Output | **P0** | F2 | **design** |"),
    ("| 4 | `F4-quality-pivot` | RealGrid2 Pivot 품질 이력 — Spec 이탈 셀 Red 조건부 서식, Excel Export | P1 | F2 | pending |",
     "| 4 | `F4-quality-pivot` | RealGrid2 Pivot 품질 이력 — Spec 이탈 셀 Red 조건부 서식, Excel Export | P1 | F2 | **design** |"),
], "3) master-plan §2 표 복구 (R9)")

# ================= 4) 각 §9 에 신설 에러코드 반영 =================
fix("docs/02-design/F2-inspection-result.design.md", [
    ("| 요청 | `LOT_NOT_INSPECTABLE` | `LOT_STATUS` 가 검사 불가 상태 |",
     "| 요청 | `LOT_NOT_INSPECTABLE` | `LOT_STATUS` 가 검사 불가 상태 |\n"
     "| 요청 | `INSP_USER_REQUIRED` | `inspUserId` 누락 |"),
    ("> `inspItemCd` 는 보조 표시용이며, **식별 기준은 `rowIndex`** 다.",
     "> `inspItemCd` 는 보조 표시용이며, **식별 기준은 `rowIndex`** 다. "
     "보조 키 추가는 F0 design §8.2 확장 규칙에 따라 본 절에서 선언한 것이다 (R7)."),
    ("| 0.4 | 2026-09-04 | M4 4차 반영 — **N12 §9.3 행 단위 에러 계약 신설**(`errors[].rowIndex`, F1 §9.3과 통일), N17 Mapper XML 방언 분리 |",
     "| 0.4 | 2026-09-04 | M4 4차 반영 — **N12 §9.3 행 단위 에러 계약 신설**(`errors[].rowIndex`, F1 §9.3과 통일), N17 Mapper XML 방언 분리 |\n"
     "| 0.5 | 2026-09-04 | M4 5차 반영 — `INSP_USER_REQUIRED` 신설, R7 보조 키 확장 근거 명시 |"),
], "4) F2 에러코드")

fix("docs/02-design/F3-coa-print.design.md", [
    ("| `CUST_NM_REQUIRED` | 고객사명 누락 |",
     "| `CUST_NM_REQUIRED` | 고객사명 누락 |\n"
     "| `SHIP_QTY_REQUIRED` | `shipQty` 누락 |\n"
     "| `ISSUE_USER_REQUIRED` | `issueUserId` 누락 |"),
    ("| `COA_NOT_FOUND` | 존재하지 않는 성적서 번호 |",
     "| `COA_NOT_FOUND` | 존재하지 않는 성적서 번호. **`coaNo` 누락도 이 코드로 흡수** |"),
    ("**최대 92일** — F4 §7과 동일 정책", "**최대 92일** — F4 design §7과 동일 정책"),
    ("| 0.4 | 2026-09-04 | M4 4차 반영 — N19 §9.1 기간 상한 92일 정책 명시, N17 Mapper XML 방언 분리 |",
     "| 0.4 | 2026-09-04 | M4 4차 반영 — N19 §9.1 기간 상한 92일 정책 명시, N17 Mapper XML 방언 분리 |\n"
     "| 0.5 | 2026-09-04 | M4 5차 반영 — `SHIP_QTY_REQUIRED`·`ISSUE_USER_REQUIRED` 신설, `coaNo` 누락 흡수 명시, N16 참조 수식 |"),
], "4) F3 에러코드")

fix("docs/02-design/F1-quality-spec.design.md", [
    ("| V9 | `decimalLen` 0~6 | 행 | `errors[].code` = `INVALID_DECIMAL_LEN` |",
     "| V9 | `decimalLen` 0~6 | 행 | `errors[].code` = `INVALID_DECIMAL_LEN` |\n"
     "| V10 | `useYn` ∈ {`Y`,`N`} | 행 | `errors[].code` = `INVALID_YN_FLAG` |"),
    ("`INVALID_DECIMAL_LEN` | V2~V9 (§4) |",
     "`INVALID_DECIMAL_LEN` / `INVALID_YN_FLAG` | V2~V10 (§4) |"),
    ("스키마 소유는 F0 §8.2.", "스키마 소유는 F0 design §8.2."),
    ("| 0.4 | 2026-09-04 | M4 4차 반영 — N19 §9.3 에러코드 표 신설, N17 Mapper XML 방언 분리 |",
     "| 0.4 | 2026-09-04 | M4 4차 반영 — N19 §9.3 에러코드 표 신설, N17 Mapper XML 방언 분리 |\n"
     "| 0.5 | 2026-09-04 | M4 5차 반영 — V10 `useYn` 검증 + `INVALID_YN_FLAG` 신설, N16 참조 수식 |"),
], "4) F1 V10")

# ================= 5) plan 문구 정합 (부수 관찰) =================
fix("docs/01-plan/features/F2-inspection-result.plan.md", [
    ("- [ ] **종합 판정** — 전 항목 AND 집계",
     "- [ ] **종합 판정** — 우선순위 집계: **하나라도 `NONE` → `NONE`** / 하나라도 `FAIL` → `FAIL` / 전부 `PASS` → `PASS` (Design §1.3)"),
], "5) F2 plan 종합판정 문구")

fix("docs/01-plan/features/F4-quality-pivot.plan.md", [
    ("| `MST_INSP_SPEC` (F1) | 이탈 판정 기준으로 읽음 | F1 변경 시 영향 받음 |",
     "| `MST_INSP_SPEC` (F1) | **열 제목·규격 표기·자릿수 표시용**으로 읽음 (이탈 판정은 F2 `judgeResult` 사용 — Design §5) | F1 변경 시 영향 받음 |"),
], "5) F4 plan 판정 기준 문구")

# ================= 자기검증 =================
print("\n=== 신규 절 자기검증 (이번에 만든 것 우선) ===")
docs = sorted(glob.glob(os.path.join(ROOT, "docs", "**", "*.md"), recursive=True))
txt = {os.path.basename(d): io.open(d, encoding="utf-8").read() for d in docs}

f0 = txt["F0-common-core.design.md"]
reg = re.findall(r"^\| `([A-Z_]+)` \| \d00 \|", f0, re.M)
print("  레지스트리 코드 수: " + str(len(reg)) + " (중복 " + str(len(reg) - len(set(reg))) + ")")

# 각 feature §9 에서 쓰는 코드가 레지스트리에 있는지
used = set()
for name, t in txt.items():
    if name.endswith(".design.md") and name != "F0-common-core.design.md":
        used |= set(re.findall(r"`([A-Z][A-Z_]{4,})`", t))
known = set(reg) | {"VALIDATION_FAILED", "INTERNAL_ERROR"}
# 코드형 토큰만 (테이블/컬럼명 제외)
codes = {u for u in used if u.endswith(("_REQUIRED", "_FOUND", "_INVALID", "_DUPLICATED", "_FAILED",
                                        "_TOO_LONG", "_REVERSED", "_ROWS", "_ISSUABLE", "_INSPECTABLE",
                                        "_EXCEEDS_GOOD_QTY", "_FLAG", "_LEN", "_TYPE", "_DEFINED"))}
missing = sorted(c for c in codes if c not in known and not c.startswith(("MST_", "TRN_")))
print("  레지스트리 미등록 코드: " + (str(missing) if missing else "0건"))

for label, pat in [
    ("VALIDATION_FAILED 를 errors 없이 쓴 예시", r'"errorCode": "VALIDATION_FAILED"[^\n]*\n(?![^\n]*errors)[^\n]*\}'),
    ("do phase 진입 금지", r"do phase 진입 금지"),
    ("22개 코드", r"22개 코드"),
    ("N18 오기 (레지스트리 제목)", r"레지스트리 \(스프린트 전역 — N18\)"),
]:
    hits = sorted({n for n, t in txt.items() if re.search(pat, t)})
    print(("  [OK] " if not hits else "  [!!] ") + label + " -> " + (str(hits) if hits else "0건"))
