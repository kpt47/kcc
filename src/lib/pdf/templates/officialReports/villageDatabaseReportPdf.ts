import { documentShell, fill, signatureRow } from "../../layout";
import type { Report3Row } from "@/lib/analytics";
import { formatThaiDate } from "@/lib/formatDate";

const STYLE = `
  .page { padding: 1cm 0.8cm; }
  table.ledger th, table.ledger td { padding: 3px 4px; font-size: 11px; }
  table.ledger td.name-cell { text-align: left; min-width: 140px; }
  .legend { margin-top: 10px; font-size: 11px; }
  .legend p { margin: 1px 0; }
`;

function money(n: number): string {
  return n.toLocaleString("th-TH");
}

/**
 * แบบฟอร์ม (ข้อ 27) — แบบรายงานฐานข้อมูลหมู่บ้านและครัวเรือนเป้าหมายโครงการ กข.คจ. ระดับจังหวัด
 * คอลัมน์ (จ)(ฉ) รายได้ผ่านเกณฑ์ จปฐ., (ฒ) ระดับการพัฒนา, (ณ) หน่วยงานสนับสนุนอื่น ไม่มีข้อมูลจริงรองรับในระบบ
 * (ดูหมายเหตุใน getReport3Rows) — แสดงเป็นขีด "-" ให้เจ้าหน้าที่กรอกเพิ่มด้วยมือ ไม่ปั้นข้อมูลปลอม
 */
export function renderVillageDatabaseReportHtml(rows: Report3Row[], generatedAt: Date): string {
  const tableRows = rows
    .map(
      (r) => `
      <tr>
        <td class="name-cell">${r.villageName}</td>
        <td>${fill(r.targetHouseholds)}</td>
        <td>${fill(r.targetMembers)}</td>
        <td>${fill(r.householdsWithLoan)}</td>
        <td>${fill(r.membersWithLoan)}</td>
        <td>-</td>
        <td>-</td>
        <td>${fill(money(r.totalFund))}</td>
        <td>${fill(r.activeHouseholds)}</td>
        <td>${fill(money(r.activeAmount))}</td>
        <td>${fill(money(r.bankBalance))}</td>
        <td>${fill(money(r.fundShortfall))}</td>
        <td>${fill(r.defaultedHouseholds)}</td>
        <td>${fill(money(r.defaultedAmount))}</td>
        <td>-</td>
        <td>-</td>
      </tr>`
    )
    .join("");

  const body = `
    <div class="page">
      <p class="center bold" style="font-size: 17px; margin-bottom: 2px;">
        แบบรายงานฐานข้อมูลหมู่บ้านและครัวเรือนเป้าหมายโครงการแก้ไขปัญหาความยากจน (กข.คจ.)
      </p>
      <p class="center" style="margin: 2px 0 10px;">
        ข้อมูล ณ วันที่ ${formatThaiDate(generatedAt)}
      </p>

      <table class="ledger">
        <thead>
          <tr>
            <th rowspan="2">ชื่อหมู่บ้าน</th>
            <th colspan="4">ฐานข้อมูล</th>
            <th colspan="2">รายได้ผ่านเกณฑ์ จปฐ.</th>
            <th rowspan="2">เงินทุนโครงการ<br/>กข.คจ. ทั้งหมด<br/>(บาท) (ช)</th>
            <th colspan="2">ครัวเรือนยืมคงค้าง<br/>(ไม่ผิดนัด)</th>
            <th rowspan="2">เงินฝากธนาคาร<br/>(บาท) (ญ)</th>
            <th rowspan="2">เงินทุนที่ขาด<br/>หายไป (บาท) (ฎ)</th>
            <th colspan="2">ครัวเรือนผิดนัด<br/>(ไม่อยู่ในเกณฑ์ผ่อนผัน)</th>
            <th rowspan="2">ระดับการ<br/>พัฒนา (ฒ)</th>
            <th rowspan="2">หน่วยงาน<br/>สนับสนุนอื่น (ณ)</th>
          </tr>
          <tr>
            <th>ครัวเรือน<br/>เป้าหมาย (ก)</th>
            <th>คน (ข)</th>
            <th>ได้รับ<br/>เงินยืม (ค)</th>
            <th>คน (ง)</th>
            <th>ครัวเรือน (จ)</th>
            <th>คน (ฉ)</th>
            <th>ครัวเรือน (ซ)</th>
            <th>เงินยืม (บาท) (ฌ)</th>
            <th>ครัวเรือน (ฐ)</th>
            <th>เงินยืม (บาท) (ฑ)</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || `<tr><td colspan="16">ไม่พบหมู่บ้านตามเงื่อนไขที่กำหนด</td></tr>`}
        </tbody>
      </table>

      <div class="legend">
        <p><u>คำอธิบาย</u> (จ)(ฉ) และ (ฒ)(ณ) ไม่มีข้อมูลจริงในระบบ (ค่าเกณฑ์ จปฐ./ผลประเมินเชิงอัตนัยรายปี/
        หน่วยงานสนับสนุนอื่น) แสดงเป็นขีด "-" ให้เจ้าหน้าที่กรอกเพิ่มเติมด้วยมือ</p>
      </div>

      <p class="footnote"><u>หมายเหตุ</u> แบบแนบท้ายระเบียบกระทรวงมหาดไทยฯ พ.ศ.2553 ข้อ 27</p>

      ${signatureRow([{ name: null, title: "พัฒนาการจังหวัด" }])}
    </div>`;

  return documentShell(body, { extraStyle: STYLE, pageSize: "A4 landscape" });
}
