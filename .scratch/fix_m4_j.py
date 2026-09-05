# -*- coding: utf-8 -*-
"""M4 10차 - 잔여 12건 + 편측 수정 탐지"""
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


# ===== 1위: F1 plan §6.2 모순 (F4 plan 과 편측) =====
fix("docs/01-plan/features/F1-quality-spec.plan.md", [
    ("| `MST_INSP_SPEC` | **F4** — Pivot 이탈 판정 기준 | Breaking |",
     "| `MST_INSP_SPEC` | **F4** — 열 제목·규격 표기·자릿수 표시용 (이탈 판정은 F2 `judgeResult` 사용 — F4 design §5) | Breaking |"),
    ("| 0.1 | 2026-09-04 | 최초 작성 |",
     "| 0.1 | 2026-09-04 | 최초 작성 |\n"
     "| 0.2 | 2026-09-04 | M4 반영 — API 2→3종, §6.1 `item-list` 추가, §6.2 F4 용도 정정(이탈 판정 아님) |"),
], "1위 F1 plan §6.2 모순")

# ===== 2위: lotNo / specList 누락 코드 =====
fix("docs/02-design/F0-common-core.design.md", [
    ("| `LOT_NOT_FOUND` | 400 | F2·F3 | 요청 | 존재하지 않는 Lot |",
     "| `LOT_NOT_FOUND` | 400 | F2·F3 | 요청 | 존재하지 않는 Lot. **`lotNo` 누락도 이 코드로 흡수** |"),
    ("| `INVALID_YN_FLAG` | 400 | F1 | 행 | `useYn` 이 `Y`/`N` 밖 (V10) |",
     "| `INVALID_YN_FLAG` | 400 | F1 | 행 | `useYn` 이 `Y`/`N` 밖 (V10) |\n"
     "| `SPEC_LIST_REQUIRED` | 400 | F1 | 요청 | `specList` 자체가 누락 (빈 배열 `[]` 은 전건 삭제로 정상 처리) |"),
    # R7 sortNo 이중 지위 해소 — 규칙문에서 sortNo 제거
    ("보조 표시 키(`sortNo`, `inspItemCd` 등)는 **해당 feature가 자신의 §9 계약에 명시적으로 선언한 것에 한해** 추가할 수 있다.",
     "`sortNo` 는 위 표의 **정식 선택 키**이므로 별도 선언 없이 쓸 수 있다. "
     "그 밖의 보조 표시 키(`inspItemCd` 등)는 **해당 feature가 자신의 §9 계약에 명시적으로 선언한 것에 한해** 추가할 수 있다."),
    ("| 0.5 | 2026-09-04 | M4 5차 반영 — R6 `INSP_ITEM_DUPLICATED` 소유 F1·F2 병기, R7 `errors[]` 보조 키 확장 규칙, "
     "R8 §9.3 예시 요청 단위로 정정, R10 제목/도입문 정정, 필수 파라미터 코드 5종 신설, 성공 상태코드 200 명시 |",
     "| 0.5 | 2026-09-04 | M4 5차 반영 — R6 `INSP_ITEM_DUPLICATED` 소유 F1·F2 병기, R7 `errors[]` 보조 키 확장 규칙, "
     "R8 §9.3 예시 요청 단위로 정정, R10 제목/도입문 정정, 필수 파라미터 코드 5종 신설, 성공 상태코드 200 명시 |\n"
     "| 0.6 | 2026-09-04 | M4 6차 반영 — `LOT_NOT_FOUND` 에 `lotNo` 누락 흡수, `SPEC_LIST_REQUIRED` 신설(29종), "
     "R7 규칙문의 `sortNo` 이중 지위 해소 |"),
], "2위 F0 레지스트리 (lotNo·specList·R7)")

fix("docs/02-design/F1-quality-spec.design.md", [
    ("| 요청 | `ITEM_REQUIRED` | `itemCd` 누락 (V1) |",
     "| 요청 | `ITEM_REQUIRED` | `itemCd` 누락 (V1) |\n"
     "| 요청 | `SPEC_LIST_REQUIRED` | `specList` 자체가 누락 (빈 배열은 전건 삭제로 정상) |"),
    # 4위: V10 파급 4곳
    ("| **행 단위** (V2~V9) | 항상 `VALIDATION_FAILED` | 위반 행마다 1건. **`rowIndex` 필수** (F0 §8.2) |",
     "| **행 단위** (V2~V10) | 항상 `VALIDATION_FAILED` | 위반 행마다 1건. **`rowIndex` 필수** (F0 design §8.2) |"),
    ("| `SpecValidator` (순수) | 엔드포인트 없음 - §9.3이 호출. §4 V1~V9 |",
     "| `SpecValidator` (순수) | 엔드포인트 없음 - §9.3이 호출. §4 **V1~V10** |"),
    ("| L1 | `SpecValidator` | V1~V9 각각 / `lsl == usl` 경계 / `MAX` 인데 `lsl` 존재 |",
     "| L1 | `SpecValidator` | **V1~V10** 각각 / `lsl == usl` 경계 / `MAX` 인데 `lsl` 존재 / `useYn='X'` (V10) |"),
    ("- [x] 검증 규칙이 코드와 함께 열거되었다 (§4 V1~V9)",
     "- [x] 검증 규칙이 코드와 함께 열거되었다 (§4 V1~V10)"),
    ("| 0.5 | 2026-09-04 | M4 5차 반영 — V10 `useYn` 검증 + `INVALID_YN_FLAG` 신설, N16 참조 수식 |",
     "| 0.5 | 2026-09-04 | M4 5차 반영 — V10 `useYn` 검증 + `INVALID_YN_FLAG` 신설, N16 참조 수식 |\n"
     "| 0.6 | 2026-09-04 | M4 6차 반영 — V10 파급 4곳 정정(§4·§10·§12·§14), `SPEC_LIST_REQUIRED` 반영 |"),
], "2·4위 F1 design (specList·V10 파급)")

fix("docs/02-design/F2-inspection-result.design.md", [
    ("| `LOT_NOT_FOUND` | 존재하지 않는 Lot |\n| `SPEC_NOT_DEFINED` | 해당 품목에 Spec 미등록 |",
     "| `LOT_NOT_FOUND` | 존재하지 않는 Lot. **`lotNo` 누락도 흡수** |\n| `SPEC_NOT_DEFINED` | 해당 품목에 Spec 미등록 |"),
    ("| 요청 | `LOT_NOT_FOUND` | 존재하지 않는 Lot |",
     "| 요청 | `LOT_NOT_FOUND` | 존재하지 않는 Lot. **`lotNo` 누락도 흡수** |"),
    ("| 0.5 | 2026-09-04 | M4 5차 반영 — `INSP_USER_REQUIRED` 신설, R7 보조 키 확장 근거 명시 |",
     "| 0.5 | 2026-09-04 | M4 5차 반영 — `INSP_USER_REQUIRED` 신설, R7 보조 키 확장 근거 명시 |\n"
     "| 0.6 | 2026-09-04 | M4 6차 반영 — `LOT_NOT_FOUND` 에 `lotNo` 누락 흡수 명시 |"),
], "2위 F2 lotNo 흡수")

fix("docs/02-design/F3-coa-print.design.md", [
    ("| `LOT_NOT_FOUND` | 존재하지 않는 Lot |\n| `LOT_NOT_ISSUABLE` | `LOT_STATUS != 'OK'` |",
     "| `LOT_NOT_FOUND` | 존재하지 않는 Lot. **`lotNo` 누락도 흡수** |\n| `LOT_NOT_ISSUABLE` | `LOT_STATUS != 'OK'` |"),
    ("| `LOT_NOT_FOUND` | 존재하지 않는 Lot |\n| `LOT_NOT_ISSUABLE` | `LOT_STATUS != 'OK'` (§4 단계 1) |",
     "| `LOT_NOT_FOUND` | 존재하지 않는 Lot. **`lotNo` 누락도 흡수** |\n| `LOT_NOT_ISSUABLE` | `LOT_STATUS != 'OK'` (§4 단계 1) |"),
    # 5위: §9.4 헤더 11키 -> 10키
    ("| 헤더 11키 | `TRN_COA` | `TRN_COA` (동일) |",
     "| 헤더 10키 | `TRN_COA` | `TRN_COA` (동일) |"),
    ("| 0.5 | 2026-09-04 | M4 5차 반영 — `SHIP_QTY_REQUIRED`·`ISSUE_USER_REQUIRED` 신설, `coaNo` 누락 흡수 명시, N16 참조 수식 |",
     "| 0.5 | 2026-09-04 | M4 5차 반영 — `SHIP_QTY_REQUIRED`·`ISSUE_USER_REQUIRED` 신설, `coaNo` 누락 흡수 명시, N16 참조 수식 |\n"
     "| 0.6 | 2026-09-04 | M4 6차 반영 — §9.4 헤더 11키→10키 정정(`itemUnitCd` 는 조인 파생), `lotNo` 누락 흡수 |"),
], "2·5위 F3 (lotNo·헤더10키)")

# ===== 3위: data-model 끊어진 참조 N16 완결 =====
fix("docs/02-design/mes-coa-s1.data-model.md", [
    ("| 1 | **코드와 명칭은 항상 별도 컬럼** | `||` 결합 금지 (F0 §1.2). 조립은 화면이 한다 |",
     "| 1 | **코드와 명칭은 항상 별도 컬럼** | `||` 결합 금지 (F0 **plan** §1.2). 조립은 화면이 한다 |"),
    ("| 2 | **DB 방언 의존 컬럼 타입 금지** | Mock → SQLite3 → Oracle 3단계 전환 (F0 §2.3) |",
     "| 2 | **DB 방언 의존 컬럼 타입 금지** | Mock → SQLite3 → Oracle 3단계 전환 (F0 **plan** §2.3) |"),
    ("- **설계 소유 feature**: **F0** (F0 §2.1에 편입). DDL과 Mock 데이터만 산출한다",
     "- **설계 소유 feature**: **F0** (F0 **plan** §2.1 In Scope에 편입). DDL과 Mock 데이터만 산출한다"),
    ("Mock 데이터는 SQLite 전환 시 `INSERT` seed 로 재사용한다 (F0 §8).",
     "Mock 데이터는 SQLite 전환 시 `INSERT` seed 로 재사용한다 (F0 **plan** §8)."),
    ("## 6. 부동소수점 판정 문제 (F2 §5 위험 대응)",
     "## 6. 부동소수점 판정 문제 (F2 **plan** §5 Risks 대응)"),
    ("| 소수 비교 | `REAL` 부동소수 | `NUMBER` 정밀 | ⚠️ **판정 정확도 문제.** §6 참조 |",
     "| 소수 비교 | `REAL` 부동소수 | `NUMBER` 정밀 | ⚠️ **판정 정확도 문제.** §6 참조 (F2 **plan** §5 위험) |"),
    ("| F2 §2.3 | 판정 시점 | **프론트(즉시 표시) + 서버(최종)** 이중. §6 |",
     "| F2 **plan** §2.3 | 판정 시점 | **프론트(즉시 표시) + 서버(최종)** 이중. §6 |"),
    ("| F2 §5 | 부동소수 오차 | **서버 `BigDecimal`**. §6 |",
     "| F2 **plan** §5 | 부동소수 오차 | **서버 `BigDecimal`**. §6 |"),
    ("| F3 §2.3 | 규격 스냅샷 | **발행시점 복사 저장** → `TRN_COA_DETAIL` 신설. §3.9 |",
     "| F3 **plan** §2.3 | 규격 스냅샷 | **발행시점 복사 저장** → `TRN_COA_DETAIL` 신설. §3.9 |"),
    ("| F3 FR-08 | 성적서 채번 규칙 | `CoA-YYYYMMDD-NNN`. **§4.6** |",
     "| F3 **plan** FR-08 | 성적서 채번 규칙 | `CoA-YYYYMMDD-NNN`. **§4.6** |"),
    ("| F1 FR-10 | 재검사 저장 방식 | `INSP_SEQ` 행 누적 + `LATEST_YN`. §3.7 |",
     "| F2 **plan** FR-10 | 재검사 저장 방식 | `INSP_SEQ` 행 누적 + `LATEST_YN`. §3.7 |"),
    ("| F3 §2.3 | PDF 출력 방식 | **미결정** — F3 Design에서 확정 |",
     "| F3 **plan** §2.3 | PDF 출력 방식 | **확정 — 브라우저 인쇄** (F3 design §5) |"),
    ("| F4 §2.3 | 그리드 라이브러리 | **확정 — RealGrid2 2.10.0** (테스트 라이선스 확보. F4 §13 · master §8 R3 해소) |",
     "| F4 **plan** §2.3 | 그리드 라이브러리 | **확정 — RealGrid2 2.10.0** (F4 design §13 · master-plan §8 R3 해소) |"),
    # 7위: §3.2 용도 정정
    ("- **용도**: F0 `MultiTreeCombo` 트리 데이터, F2 공정 선택",
     "- **용도**: F0 `MultiTreeCombo` 트리 데이터 / **F4 공정 다중선택 필터**(F4 design §3) / F2 §9.1·F4 §9.1 공정명 조인 표시"),
    ("| 0.7 | 2026-09-04 | M4 5차 반영 — §3.6·§3.7·§3.9 응답 키 노출 범위 명시(미노출 컬럼·헤더/원소 레벨 구분), N16 문서 수식 참조 |",
     "| 0.7 | 2026-09-04 | M4 5차 반영 — §3.6·§3.7·§3.9 응답 키 노출 범위 명시(미노출 컬럼·헤더/원소 레벨 구분), N16 문서 수식 참조 |\n"
     "| 0.8 | 2026-09-04 | M4 6차 반영 — N16 완결(plan 참조 12건 수식), §3.2 용도 정정, §8 PDF 출력 확정 상태 동기 |"),
], "3·7위 data-model (N16 완결·§3.2)")

# ===== 6위: master-plan G1 사용 Feature 열 =====
fix("docs/01-plan/features/mes-coa.master-plan.md", [
    ("| `MST_PROCESS` | 기준정보(트리) | `PROC_CD`, `PROC_NM`, `PARENT_PROC_CD`, `SORT_NO` | F0 (MultiTreeCombo) |",
     "| `MST_PROCESS` | 기준정보(트리) | `PROC_CD`, `PROC_NM`, `PARENT_PROC_CD`, `SORT_NO` | F0, F2, F4 |"),
    ("| `MST_ITEM` | 기준정보 | `ITEM_CD`, `ITEM_NM`, `ITEM_SPEC`, `UNIT_CD` | F1 |",
     "| `MST_ITEM` | 기준정보 | `ITEM_CD`, `ITEM_NM`, `ITEM_SPEC`, `UNIT_CD` | F1, F2, F3, F4 |"),
    ("`USL`, `LSL`, `TARGET_VAL`, `JUDGE_TYPE` | F1, F2, F3 |",
     "`USL`, `LSL`, `TARGET_VAL`, `JUDGE_TYPE`, `SORT_NO`, `DECIMAL_LEN` | F1, F2, F3, F4 |"),
    ("| `TRN_LOT` | 트랜잭션 | `LOT_NO`, `PARENT_LOT_NO`, `ITEM_CD`, `WO_NO`, `PROC_CD`, `GOOD_QTY`, `LOT_STATUS` | F2, F3, Sprint-2 |",
     "| `TRN_LOT` | 트랜잭션 | `LOT_NO`, `PARENT_LOT_NO`, `ITEM_CD`, `WO_NO`, `PROC_CD`, `GOOD_QTY`, `LOT_STATUS`, `TOTAL_JUDGE` | F2, F3, F4, Sprint-2 |"),
    # 12위: 진행 로그
    ("| 2026-09-04 | design | data-model + Design 5종 작성. API 13종 계약 확정. M4 게이트 반복 측정 중 (60→88→89→90). |",
     "| 2026-09-04 | design | data-model + Design 5종 작성. API 13종 계약 확정. 에러코드 레지스트리 29종. "
     "M4 게이트 반복 측정 (60→88→89→90→91→91). |"),
], "6·12위 master-plan G1")

# ===== 8위: plan 결정 상태 동기 (편측 해소) =====
fix("docs/01-plan/features/F3-coa-print.plan.md", [
    ("| PDF 출력 방식 | 브라우저 인쇄 (`window.print()`) **잠정** | 외부 의존성 0. Design에서 §2.3 재확인 후 확정 |",
     "| PDF 출력 방식 | **브라우저 인쇄 확정** (`window.print()` + `@media print`) | 외부 의존성 0. 서버 PDF는 한글 폰트 임베딩 비용으로 배제 (F3 design §5) |"),
    ("### 2.3 결정 필요 — Design phase에서 확정",
     "### 2.3 ~~결정 필요~~ **Design에서 확정 완료**"),
    ("| 출력 방식 | ⓐ 브라우저 `window.print()` + `@media print` CSS ⓑ 서버 PDF 생성 | **ⓐ** — 의존성 0, 즉시 구현. 단 브라우저별 여백 차이 확인 필요 |",
     "| ~~출력 방식~~ | ~~ⓐ 브라우저 인쇄 ⓑ 서버 PDF~~ | **확정: ⓐ 브라우저 인쇄** (design §5) |"),
    ("| 규격 스냅샷 | ⓐ 발행 시점 규격을 `TRN_COA` 에 복사 저장 ⓑ 항상 F1 현재값 조인 | **ⓐ 검토** — F1이 이력 미관리이므로, 규격이 바뀌면 과거 성적서 내용이 소급 변경된다 |",
     "| ~~규격 스냅샷~~ | ~~ⓐ 복사 저장 ⓑ 현재값 조인~~ | **확정: ⓐ 스냅샷** → `TRN_COA_DETAIL` 신설 (data-model §3.9) |"),
], "8위 F3 plan 결정 동기")

fix("docs/01-plan/features/F2-inspection-result.plan.md", [
    ("### 2.3 결정 필요 — Design phase에서 확정",
     "### 2.3 ~~결정 필요~~ **Design에서 확정 완료**"),
    ("| 판정 시점 | ⓐ 입력 즉시(프론트 계산) ⓑ 저장 시(서버 계산) ⓒ 둘 다 | **ⓒ 권장** — 프론트는 즉시 피드백용, 서버는 신뢰 원천 |",
     "| ~~판정 시점~~ | ~~ⓐ 프론트 ⓑ 서버 ⓒ 둘 다~~ | **확정: ⓒ 이중** — 프론트 즉시 표시 + 서버 최종 (design §2) |"),
    ("| 잠김 해제 | 누가 어떤 조건으로 푸는가 | Sprint-1은 \"해제 없음\"으로 단순화 검토 |",
     "| ~~잠김 해제~~ | ~~누가 어떤 조건으로~~ | **확정: 해제 기능 없음** — 재검사로 PASS 되면 자동 복귀 (design §5) |"),
    ("| 0.1 | 2026-09-04 | 최초 작성 |",
     "| 0.1 | 2026-09-04 | 최초 작성 |\n"
     "| 0.2 | 2026-09-04 | M4 반영 — FR-08b 신설, API 2→3종, §2.1 종합판정 NONE-우선, §2.3 결정 2건 확정 표기 |"),
], "8위 F2 plan 결정 동기")

# ===== 10위: F4 소유 라벨 =====
fix("docs/02-design/F4-quality-pivot.design.md", [
    ("| `src/utils/specFormat.js` | **F2·F3 공유** (D12) | `formatSpecRange` — 열 제목·툴팁 규격 표기, `decimalLen` 자릿수 |",
     "| `src/utils/specFormat.js` | **F2 소유** (F3·F4 소비) | `formatSpecRange` — 열 제목·툴팁 규격 표기, `decimalLen` 자릿수 |"),
], "10위 F4 소유 라벨")

# ================= 편측 수정 탐지 =================
print("\n=== 편측 수정 탐지 (A/B 쌍 대조) ===")
docs = sorted(glob.glob(os.path.join(ROOT, "docs", "**", "*.md"), recursive=True))
txt = {os.path.basename(d): io.open(d, encoding="utf-8").read() for d in docs}
allt = "\n".join(txt.values())

pairs = [
    ("F4 이탈 판정 기준 (F1/F4 plan 쌍)", r"F4\*?\*? — Pivot 이탈 판정 기준"),
    ("PDF 출력 '잠정'", r"브라우저 인쇄 \(`window\.print\(\)`\) \*\*잠정\*\*"),
    ("V1~V9 / V2~V9 스테일 범위", r"V1~V9|V2~V9"),
    ("헤더 11키", r"헤더 11키"),
    ("결정 필요 — Design phase에서 확정", r"### 2\.3 결정 필요"),
    ("specFormat F2·F3 공유 라벨", r"specFormat\.js` \| \*\*F2·F3 공유"),
]
for label, pat in pairs:
    hits = sorted({n for n, t in txt.items() if re.search(pat, t)})
    print(("  [OK] " if not hits else "  [!!] ") + label + " -> " + (str(hits) if hits else "0건"))

# 끊어진 참조: data-model 안의 무수식 F0/F2/F3/F4 §n 참조
bare = re.findall(r"\(F[0-4] §[0-9.]+", txt["mes-coa-s1.data-model.md"])
print("  [OK] " if not bare else "  [!!] ", "data-model 무수식 참조 ->", bare if bare else "0건")

f0 = txt["F0-common-core.design.md"]
reg = re.findall(r"^\| `([A-Z_]+)` \| \d00 \|", f0, re.M)
print("  에러코드 레지스트리: " + str(len(reg)) + "종 (중복 " + str(len(reg) - len(set(reg))) + ")")
