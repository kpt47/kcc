// Layout/CSS ที่ใช้ร่วมกันในทุกเอกสาร PDF ให้ตรงกับรูปแบบฟอร์มราชการต้นฉบับ:
// ฟอนต์ Sarabun (แทน TH Sarabun New ที่ใช้ในเอกสารราชการไทย), เส้นใต้จุดไข่ปลาสำหรับช่องกรอกข้อมูล,
// วงเล็บช่องทำเครื่องหมาย ( ) แบบฟอร์มกระดาษ, ตารางเส้นตรงสำหรับสมุดบัญชี

import { SEALS_ROW_BASE64 } from "./assets/sealAssets";
import { BRAND_ALT } from "@/lib/branding";

const BASE_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');

  * { box-sizing: border-box; }
  body {
    font-family: "Sarabun", "TH Sarabun New", sans-serif;
    font-size: 16px;
    line-height: 1.8;
    color: #000;
    margin: 0;
  }
  .page {
    padding: 2cm 2cm 1.5cm 2.5cm;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }

  .center { text-align: center; }
  .bold { font-weight: 700; }
  .doc-title { font-weight: 700; font-size: 18px; margin: 0 0 2px; }

  .doc-header { display: flex; justify-content: center; margin-bottom: 8px; }
  .doc-header img { height: 44px; width: auto; }

  .top-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  .fill {
    display: inline-block;
    border-bottom: 1px dotted #000;
    min-width: 40px;
    padding: 0 4px;
    text-align: center;
  }
  .fill.wide { min-width: 160px; }
  .fill.grow { min-width: 90px; }

  p.form-item { margin: 10px 0 4px; }
  p.form-line { margin: 4px 0 4px 1.5em; }

  .sig-block {
    margin-top: 22px;
    text-align: right;
    padding-right: 1cm;
  }
  .sig-block .sig-line { margin: 2px 0; }
  .sig-block .sig-name { margin: 2px 60px 2px 0; }

  .sig-row {
    display: flex;
    justify-content: space-around;
    margin-top: 36px;
    gap: 16px;
  }
  .sig-col {
    text-align: center;
    font-size: 14px;
  }
  .sig-col .sig-dots { display: block; margin-bottom: 6px; }
  .sig-col .sig-label { display: block; font-weight: 700; }
  .sig-col .sig-label.sig-name { font-weight: 400; }

  .page-num {
    text-align: center;
    font-weight: 700;
    margin-bottom: 10px;
  }
  .footnote {
    margin-top: 24px;
    font-size: 14px;
  }
  .footnote u { text-decoration: underline; }

  table.ledger {
    border-collapse: collapse;
    width: 100%;
    font-size: 13px;
  }
  table.ledger th, table.ledger td {
    border: 1px solid #000;
    padding: 3px 4px;
    text-align: center;
    vertical-align: middle;
  }
  table.ledger th { font-weight: 700; background: #f2f2f2; }
  table.ledger td.name-cell { text-align: left; }
`;

export function documentShell(
  bodyHtml: string,
  options?: { extraStyle?: string; pageSize?: string; hideSealHeader?: boolean }
): string {
  const sealHeader = options?.hideSealHeader
    ? ""
    : `<div class="doc-header"><img src="data:image/png;base64,${SEALS_ROW_BASE64}" alt="${escapeHtml(BRAND_ALT.sealsRow)}" /></div>`;

  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<style>
  @page { size: ${options?.pageSize ?? "A4"}; margin: 0; }
  ${BASE_STYLE}
  ${options?.extraStyle ?? ""}
</style>
</head>
<body>
${sealHeader}
${bodyHtml}
</body>
</html>`;
}

/** ช่องกรอกข้อมูล เช่น .......... ให้แสดงค่าจริงถ้ามี หรือเว้นว่างเป็นเส้นประถ้ายังไม่มีข้อมูล */
export function fill(value: string | number | null | undefined, opts?: { wide?: boolean; grow?: boolean }): string {
  const cls = ["fill", opts?.wide ? "wide" : "", opts?.grow ? "grow" : ""].filter(Boolean).join(" ");
  const text = value === null || value === undefined || value === "" ? "&nbsp;" : escapeHtml(String(value));
  return `<span class="${cls}">${text}</span>`;
}

/** ช่องทำเครื่องหมาย ( ) แบบฟอร์มกระดาษ เช่น ( x ) เป็นไปได้ */
export function checkbox(checked: boolean, label: string): string {
  return `(${checked ? "&nbsp;X&nbsp;" : "&nbsp;&nbsp;&nbsp;"}) ${escapeHtml(label)}`;
}

/**
 * แถวลงชื่อรับรองท้ายรายงาน — จำนวนช่องลงชื่อขึ้นกับระดับสิทธิ์ของรายงาน (ดู lib/pdf/templates/officialReports/*)
 * แต่ละช่องแสดงชื่อ-นามสกุลผู้ดำรงตำแหน่งจริง (ถ้ามี) ไว้ในวงเล็บบนเส้นแบบฟอร์ม แล้วตามด้วยชื่อตำแหน่งด้านล่าง
 * ถ้าตำแหน่งว่าง (name เป็น null) ให้แสดงเฉพาะชื่อตำแหน่งเหมือนเดิม เพื่อไม่ให้เอกสารพังเมื่อยังไม่มีผู้ดำรงตำแหน่ง
 */
export function signatureRow(entries: { name: string | null; title: string }[]): string {
  const cols = entries
    .map(
      (entry) => `
      <div class="sig-col">
        <span class="sig-dots">....................................................</span>
        ${entry.name ? `<span class="sig-label sig-name">(${escapeHtml(entry.name)})</span>` : ""}
        <span class="sig-label">${escapeHtml(entry.title)}</span>
      </div>`
    )
    .join("");
  return `<div class="sig-row">${cols}</div>`;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
