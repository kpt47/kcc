import { documentShell, fill } from "../layout";
import { formatThaiDate, thaiBahtText } from "@/lib/thai";
import { villageAddress } from "@/lib/geo";
import type { LoanForContractPdf } from "./loanContractPdf";

export type PaymentVoucherOfficials = {
  chairmanName: string | null; // ผู้จ่ายเงิน — ประธานคณะกรรมการ กข.คจ. หมู่บ้าน ค้นหาตามพื้นที่จริง
};

// ฟอร์ม 4: ใบสำคัญจ่ายเงินยืมทุนตามโครงการแก้ไขปัญหาความยากจน (กข.คจ.) — เอกสารใหม่ที่ยังไม่เคยมี PDF template มาก่อน
// บันทึกการจ่ายเงินยืมก้อนหนึ่งให้ครัวเรือนเป้าหมาย (คู่กับ Form 3 สัญญายืมเงิน)
export function renderPaymentVoucherHtml(loan: LoanForContractPdf, officials: PaymentVoucherOfficials): string {
  const h = loan.household;
  const v = h.village;
  const addr = villageAddress(v);

  const body = `
    <div class="page">
      <div class="top-row">
        <span>เล่มที่${fill(v.villageNo, { grow: true })}</span>
        <span>สัญญาเลขที่${fill(loan.contractNo, { grow: true })}</span>
      </div>
      <div class="center">
        <p class="doc-title">ใบสำคัญจ่ายเงินยืมทุน</p>
        <p class="doc-title">ตามโครงการแก้ไขปัญหาความยากจน (กข.คจ.)</p>
      </div>

      <p class="form-item">
        คณะกรรมการ กข.คจ. บ้าน${fill(v.villageName, { wide: true })} หมู่ที่${fill(v.villageNo)}
        ตำบล${fill(addr.subDistrictName, { wide: true })} อำเภอ${fill(addr.districtName, { wide: true })}
        จังหวัด${fill(addr.provinceName, { wide: true })}
      </p>
      <p class="form-item">วันที่${fill(formatThaiDate(loan.receivedDate), { wide: true })}</p>

      <p class="form-item">
        ได้จ่ายเงินทุนตามโครงการแก้ไขปัญหาความยากจน (กข.คจ.) ให้แก่ นาย/นาง/นางสาว
        ${fill(`${h.headFirstName} ${h.headLastName}`, { wide: true })} ครัวเรือนเป้าหมายลำดับที่${fill(h.sequenceNo)}
        เป็นจำนวนเงิน${fill(loan.amount.toLocaleString("th-TH"), { grow: true })} บาท
        (${fill(thaiBahtText(loan.amount), { wide: true })})
      </p>
      <p class="form-item">ซึ่งผู้รับเงินได้รับเงินจำนวนดังกล่าวไว้ถูกต้องครบถ้วนแล้ว</p>

      <div class="sig-row" style="margin-top: 48px;">
        <div class="sig-col">
          <span class="sig-dots">....................................................</span>
          ${officials.chairmanName ? `<span class="sig-label sig-name">(${officials.chairmanName})</span>` : ""}
          <span class="sig-label">ผู้จ่ายเงิน</span>
        </div>
        <div class="sig-col">
          <span class="sig-dots">....................................................</span>
          <span class="sig-label sig-name">(${h.headFirstName} ${h.headLastName})</span>
          <span class="sig-label">ผู้รับเงิน</span>
        </div>
      </div>

      <div class="sig-row" style="margin-top: 36px;">
        <div class="sig-col">
          <span class="sig-dots">....................................................</span>
          <span class="sig-label">พยาน</span>
        </div>
        <div class="sig-col">
          <span class="sig-dots">....................................................</span>
          <span class="sig-label">พยาน</span>
        </div>
      </div>

      <p class="footnote"><u>หมายเหตุ</u> จัดทำตามระเบียบกระทรวงมหาดไทยว่าด้วยการบริหารและการใช้จ่ายเงินโครงการแก้ไขปัญหาความยากจน (กข.คจ.) พ.ศ. 2553</p>
    </div>`;

  return documentShell(body);
}
