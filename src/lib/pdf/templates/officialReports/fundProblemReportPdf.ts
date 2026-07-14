import { documentShell, fill, signatureRow } from "../../layout";
import type { Report2Row } from "@/lib/analytics";

const STYLE = `
  .page { padding: 1.2cm 1cm; }
  table.ledger th, table.ledger td { padding: 4px 6px; }
  table.ledger td.name-cell { text-align: left; min-width: 220px; }
`;

/** แบบ 3.4 (รายงานสภาพปัญหาการบริหารเงินทุน) — ลงชื่อพัฒนาการจังหวัด */
export function renderFundProblemReportHtml(rows: Report2Row[], generatedAt: Date): string {
  const tableRows = rows
    .map(
      (r) => `
      <tr>
        <td class="name-cell">${r.areaName}</td>
        <td>${fill(r.currentFund.toLocaleString("th-TH"))}</td>
        <td>${fill(r.fundShortfall.toLocaleString("th-TH"))}</td>
        <td>${r.cause}</td>
        <td>${r.remedy}</td>
      </tr>`
    )
    .join("");

  const body = `
    <div class="page">
      <p class="center bold" style="font-size: 18px; margin-bottom: 2px;">
        รายงานสภาพปัญหาการบริหารเงินทุนโครงการ กข.คจ.
      </p>
      <p class="center" style="margin: 2px 0 10px;">
        ข้อมูล ณ วันที่ ${generatedAt.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <table class="ledger">
        <thead>
          <tr>
            <th>พื้นที่ (บ้าน/หมู่/ตำบล/อำเภอ)</th>
            <th>เงินทุนปัจจุบัน<br/>(บาท)</th>
            <th>เงินทุนที่<br/>ขาดหายไป (บาท)</th>
            <th>สาเหตุ</th>
            <th>การแก้ไข</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || `<tr><td colspan="5">ไม่พบพื้นที่ที่มีปัญหาการบริหารเงินทุนตามเงื่อนไขที่กำหนด</td></tr>`}
        </tbody>
      </table>

      ${signatureRow([{ name: null, title: "พัฒนาการจังหวัด" }])}
    </div>`;

  return documentShell(body, { extraStyle: STYLE, pageSize: "A4 landscape" });
}
