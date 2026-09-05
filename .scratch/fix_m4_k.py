# -*- coding: utf-8 -*-
"""M4 11차 - 탐지기가 잡은 잔여 3건"""
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


fix("docs/02-design/F3-coa-print.design.md", [
    ("§9.4 헤더 11키→10키 정정", "§9.4 헤더 키 수 11→10 정정"),
], "F3 VH 문구")

fix("docs/01-plan/features/F4-quality-pivot.plan.md", [
    ("### 2.3 결정 필요 — Design phase에서 확정",
     "### 2.3 ~~결정 필요~~ **Design에서 확정 완료**"),
    ("| 피벗 변환 위치 | ⓐ 서버에서 피벗 형태로 반환 ⓑ 서버는 평면(flat), 프론트가 피벗 | **ⓑ 권장** — 서버가 화면 형태를 모르게 유지 (F0 원칙과 일관) |",
     "| ~~피벗 변환 위치~~ | ~~ⓐ 서버 피벗 ⓑ 프론트 피벗~~ | **확정: ⓑ 프론트** — 서버가 화면 형태를 모르게 유지 (F4 design §2) |"),
    ("| 0.1 | 2026-09-04 | 최초 작성 |",
     "| 0.1 | 2026-09-04 | 최초 작성 |\n"
     "| 0.2 | 2026-09-04 | M4 반영 — RealGrid2 확정(R3 해소), §2.3 결정 2건 확정 표기, §6.2 용도·재사용 파일 명시 |"),
], "F4 plan §2.3 확정 표기")

fix("docs/02-design/mes-coa-s1.data-model.md", [
    ("(F4 §9.1 `detailList[]` 는 여러 Lot을 섞으므로 예외적으로 원소에 싣는다)",
     "(F4 **design** §9.1 `detailList[]` 는 여러 Lot을 섞으므로 예외적으로 원소에 싣는다)"),
    ("F1은 Spec 이력을 관리하지 않는다(F1 §2.2 Out of Scope)",
     "F1은 Spec 이력을 관리하지 않는다(F1 **plan** §2.2 Out of Scope)"),
    ("**Sprint-1 미사용 — 스키마 예약** (F3 §4 참조)",
     "**Sprint-1 미사용 — 스키마 예약** (F3 **design** §4.0 참조)"),
    ("**SQLite 전환 시 그대로 seed 로 재사용**한다 (F0 §8).",
     "**SQLite 전환 시 그대로 seed 로 재사용**한다 (F0 **plan** §8)."),
], "data-model 무수식 참조 4건")

# ================= 최종 검증 =================
print("\n=== 최종 검증 ===")
docs = sorted(glob.glob(os.path.join(ROOT, "docs", "**", "*.md"), recursive=True))
txt = {os.path.basename(d): io.open(d, encoding="utf-8").read() for d in docs}

checks = [
    ("F4 이탈 판정 기준 (편측)", r"F4\*?\*? — Pivot 이탈 판정 기준"),
    ("PDF 출력 '잠정'", r"\*\*잠정\*\*"),
    ("V1~V9 / V2~V9 스테일", r"V1~V9|V2~V9"),
    ("헤더 11키", r"헤더 11키"),
    ("결정 필요 — Design phase", r"### 2\.3 결정 필요"),
    ("specFormat F2·F3 공유", r"specFormat\.js` \| \*\*F2·F3 공유"),
    ("do phase 진입 금지", r"do phase 진입 금지"),
    ("출력 방식 결정 필요", r"출력 방식 결정 필요"),
]
for label, pat in checks:
    hits = sorted({n for n, t in txt.items() if re.search(pat, t)})
    print(("  [OK] " if not hits else "  [!!] ") + label + " -> " + (str(hits) if hits else "0건"))

bare = re.findall(r"\(F[0-4] §[0-9.]+", txt["mes-coa-s1.data-model.md"])
print(("  [OK] " if not bare else "  [!!] ") + "data-model 무수식 참조 -> " + (str(bare) if bare else "0건"))

f0 = txt["F0-common-core.design.md"]
reg = re.findall(r"^\| `([A-Z_]+)` \| \d00 \|", f0, re.M)
print("  에러코드 레지스트리: " + str(len(reg)) + "종 (중복 " + str(len(reg) - len(set(reg))) + ")")

mp = txt["mes-coa.master-plan.md"]
sec = re.search(r"### Sprint-1 — Phase 1.*?\n\n((?:\|.*\n)+)", mp)
rows = [r for r in sec.group(1).strip().split("\n") if r.startswith("|")]
counts = {len(r.strip().strip("|").split("|")) for r in rows}
print("  master-plan §2 표 열 수: " + str(sorted(counts)) + (" [OK]" if len(counts) == 1 else " [!!]"))

total = sum(len(io.open(d, encoding="utf-8").read().split("\n")) for d in docs)
print("  문서 총 " + str(total) + "줄 / " + str(len(docs)) + "개")
