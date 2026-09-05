<script setup>
/**
 * 출하성적서 양식 — F3 design §3
 *
 * 이 컴포넌트는 **데이터의 출처를 모른다.** 미리보기(§9.2)든 발행 결과(§9.3)든
 * 같은 모양으로 받아서 그린다. 발행 후에는 `MST_INSP_SPEC` 도 `TRN_INSP_RESULT` 도
 * 보지 않는다 — 조인하면 소급 변경되기 때문이다(§3).
 *
 * 인쇄될 때 종이에 남는 것은 **이 컴포넌트뿐**이다.
 * 나머지는 `.no-print` 로 지운다 (css/coa-print.css, §5.1).
 */
import { formatMeasured, formatSpecRange } from '@/utils/specFormat'

defineProps({
  /**
   * { coaNo, issueDt, custNm, itemCd, itemNm, lotNo, shipQty, itemUnitCd,
   *   totalJudge, issueUserNm, detailList[] }
   * 발행 전이면 coaNo·issueDt 가 null 이다 (§1 — 번호는 발행해야 나온다).
   */
  sheet: { type: Object, required: true }
})

const dateOnly = (dt) => (dt ? String(dt).slice(0, 10) : '')
</script>

<template>
  <div class="coa-sheet">
    <h1 class="coa-title">출 하 성 적 서 <span class="coa-title-en">(CoA)</span></h1>

    <table class="coa-head">
      <tbody>
        <tr>
          <th>성적서번호</th>
          <td class="num">
            {{ sheet.coaNo || '— 발행 전 —' }}
          </td>
          <th>발행일자</th>
          <td class="num">{{ dateOnly(sheet.issueDt) || '—' }}</td>
          <th>고객사</th>
          <td>{{ sheet.custNm || '—' }}</td>
        </tr>
        <tr>
          <th>품목</th>
          <td>
            <div class="num">{{ sheet.itemCd }}</div>
            <div>{{ sheet.itemNm }}</div>
          </td>
          <th>Lot No.</th>
          <td class="num">{{ sheet.lotNo }}</td>
          <th>출하수량</th>
          <td class="num">
            {{ sheet.shipQty ?? '—' }}
            <span v-if="sheet.itemUnitCd">{{ sheet.itemUnitCd }}</span>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- thead 는 인쇄 시 매 페이지 반복된다 (§5.1 table-header-group) -->
    <table class="coa-body">
      <thead>
        <tr>
          <th class="w-no">No</th>
          <th class="text-left">검사항목</th>
          <th class="w-unit">단위</th>
          <th class="w-spec">규격</th>
          <th class="w-val">측정값</th>
          <th class="w-judge">판정</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in sheet.detailList" :key="d.printSeq">
          <!-- printSeq 는 sortNo 가 아니다. 1부터 조밀 재부여한 값이다 (§3.0 D3) -->
          <td class="num text-center">{{ d.printSeq }}</td>
          <td>{{ d.inspItemNm }}</td>
          <td class="text-center">{{ d.unitCd || '' }}</td>
          <td class="num text-center">{{ formatSpecRange(d) }}</td>
          <!-- decimalLen 만큼 0을 채운다. 0.42 와 0.420 은 다른 정보다 (§3.2) -->
          <td class="num text-right">{{ formatMeasured(d.measuredVal, d.decimalLen) }}</td>
          <td class="text-center">{{ d.judgeResult }}</td>
        </tr>
      </tbody>
    </table>

    <table class="coa-foot">
      <tbody>
        <tr>
          <th>종합판정</th>
          <td class="total-judge">{{ sheet.totalJudge }}</td>
        </tr>
        <tr>
          <th>발행자</th>
          <td>
            {{ sheet.issueUserNm || '—' }}
            <span class="seal">(인)</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* 성적서는 대외 문서다. 화면 테마와 무관하게 항상 흰 바탕 + 검은 글씨로 둔다 —
   다크모드로 보다가 인쇄하면 다른 문서가 나오는 일이 없어야 한다. */
.coa-sheet {
  background: #fff;
  color: #111;
  padding: 24px 28px;
  max-width: 900px;
  margin: 0 auto;
  border: 1px solid #cfcfcf;
  font-size: 13px;
  line-height: 1.5;
}

.coa-title {
  text-align: center;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 6px;
  margin: 0 0 18px;
}
.coa-title-en {
  font-size: 14px;
  letter-spacing: 0;
  font-weight: 500;
}

.coa-sheet table {
  width: 100%;
  border-collapse: collapse;
}
.coa-sheet th,
.coa-sheet td {
  border: 1px solid #333;
  padding: 6px 8px;
  vertical-align: middle;
}
.coa-sheet th {
  background: #f0f0f0;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
}

.coa-head th {
  width: 90px;
}
.coa-body {
  margin-top: -1px; /* 헤더 표와 선을 붙인다 */
}
.coa-foot {
  margin-top: -1px;
}
.coa-foot th {
  width: 90px;
}

.w-no {
  width: 44px;
}
.w-unit {
  width: 60px;
}
.w-spec {
  width: 130px;
}
.w-val {
  width: 100px;
}
.w-judge {
  width: 70px;
}

.text-left {
  text-align: left;
}
.text-center {
  text-align: center;
}
.text-right {
  text-align: right;
}
.num {
  font-family: var(--font-num);
  font-variant-numeric: tabular-nums;
}

.total-judge {
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 1px;
}
.seal {
  float: right;
  color: #666;
}
</style>
