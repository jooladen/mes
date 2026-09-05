# -*- coding: utf-8 -*-
"""M4 9차 - 잔여 3건 마무리"""
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


fix("docs/02-design/mes-coa-s1.data-model.md", [
    ("상수 소유: `CoaStatus` (F3 §10)", "상수 소유: **`CoaStatus`** (F3 design §10)"),
], "CoaStatus 참조 수식")

# master-plan G2 - 출력 방식 확정 반영
fix("docs/01-plan/features/mes-coa.master-plan.md", [
    ("- **출력 방식 결정 필요**: 브라우저 `window.print()` + CSS `@media print` (권장, 무의존) vs 서버측 PDF 생성. → design phase에서 확정.",
     "- **출력 방식**: **브라우저 인쇄 확정** — `window.print()` + `@media print` CSS. "
     "서버측 PDF 생성은 한글 폰트 임베딩 비용 때문에 배제 (F3 design §5)."),
], "master-plan G2 출력방식 확정")

# F4 - N16 참조 수식
fix("docs/02-design/F4-quality-pivot.design.md", [
    ("`DECIMAL_LEN` 은 각 동적 컬럼의 표시 자릿수로 쓴다 (F3 §3.2와 동일 규칙).",
     "`decimalLen` 은 각 동적 컬럼의 표시 자릿수로 쓴다 (F3 design §3.2와 동일 규칙 — 응답 키 기준)."),
    ("F2의 판정 결과를 그대로 쓰거나, 같은 함수를 호출",
     "F2의 판정 결과를 그대로 쓰거나, 같은 함수를 호출 (F2 design §1.1 `SpecJudge`)"),
    ("| 0.4 | 2026-09-04 | M4 4차 반영 — N17 Mapper XML 방언 분리 |",
     "| 0.4 | 2026-09-04 | M4 4차 반영 — N17 Mapper XML 방언 분리 |\n"
     "| 0.5 | 2026-09-04 | M4 5차 반영 — N16 문서 수식 참조(`F3 design §3.2`, `F2 design §1.1`), 컬럼명→응답 키 표기 |"),
], "F4 N16 참조 수식")

# ================= 최종 자기검증 =================
print("\n=== 최종 자기검증 ===")
docs = sorted(glob.glob(os.path.join(ROOT, "docs", "**", "*.md"), recursive=True))
txt = {os.path.basename(d): io.open(d, encoding="utf-8").read() for d in docs}

f0 = txt["F0-common-core.design.md"]
reg = re.findall(r"^\| `([A-Z_]+)` \| \d00 \|", f0, re.M)
print("  에러코드 레지스트리: " + str(len(reg)) + "종 (중복 " + str(len(reg) - len(set(reg))) + ")")

# feature design 이 §9 에러표에서 쓰는 코드가 레지스트리에 있는지 (에러표 행만 스캔)
missing = []
for name, t in txt.items():
    if not name.endswith(".design.md") or name.startswith("F0"):
        continue
    for m in re.finditer(r"^\|\s*(?:요청|행|\*\*행\*\*)?\s*\|?\s*`([A-Z][A-Z_]{4,})`\s*\|", t, re.M):
        c = m.group(1)
        if c not in reg:
            missing.append(name + ":" + c)
print("  §9 에러표 미등록 코드: " + (str(sorted(set(missing))) if missing else "0건"))

checks = [
    ("출력 방식 결정 필요 (스테일)", r"출력 방식 결정 필요"),
    ("do phase 진입 금지", r"do phase 진입 금지"),
    ("22개 코드", r"22개 코드"),
    ("전 항목 AND 집계", r"전 항목 AND 집계"),
    ("Mapper` + XML 미분리", r"Mapper` \+ XML"),
]
for label, pat in checks:
    hits = sorted({n for n, t in txt.items() if re.search(pat, t)})
    print(("  [OK] " if not hits else "  [!!] ") + label + " -> " + (str(hits) if hits else "0건"))

# master-plan §2 표 열 수 검증 (R9)
mp = txt["mes-coa.master-plan.md"]
sec = re.search(r"### Sprint-1 — Phase 1.*?\n\n((?:\|.*\n)+)", mp)
if sec:
    rows = [r for r in sec.group(1).strip().split("\n") if r.startswith("|")]
    counts = {len(r.strip().strip("|").split("|")) for r in rows}
    print("  master-plan §2 표 열 수: " + str(sorted(counts)) + (" [OK]" if len(counts) == 1 else " [!!] 불일치"))
