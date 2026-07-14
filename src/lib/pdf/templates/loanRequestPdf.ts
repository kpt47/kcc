import { documentShell, fill, checkbox } from "../layout";
import { formatThaiDate, thaiBahtText } from "@/lib/thai";
import { VILLAGE_ADDRESS_INCLUDE, villageAddress } from "@/lib/geo";
import type { Prisma } from "@/generated/prisma/client";

export type LoanRequestForPdf = Prisma.LoanRequestGetPayload<{
  include: { household: { include: { village: { include: typeof VILLAGE_ADDRESS_INCLUDE } } } };
}>;

export type LoanRequestPdfOfficials = {
  workerName: string | null; // พัฒนากรผู้รับผิดชอบประจำตำบล — ค้นหาตามพื้นที่จริง (ดู lib/officials.ts)
  chairmanName: string | null; // ประธานคณะกรรมการ กข.คจ. หมู่บ้าน — ค้นหาตามพื้นที่จริง
  consentPersonName: string | null; // ผู้ให้คำยินยอม — จาก HouseholdProfile.consentPersonName ของครัวเรือน (fallback: spouseConsentName ที่กรอกตอนยื่นแบบ)
};

// จัดหน้าให้ตรงกับ "2 แบบขอยืมเงินทุนของครัวเรือนเป้าหมาย.pdf" (แบบแนบท้ายระเบียบกระทรวงมหาดไทยฯ พ.ศ. 2553 หมวด 4 ข้อ 16)
export function renderLoanRequestHtml(request: LoanRequestForPdf, officials: LoanRequestPdfOfficials): string {
  const h = request.household;
  const v = h.village;
  const addr = villageAddress(v);

  const page1 = `
    <div class="page">
      <div class="top-row">
        <span>เล่มที่${fill(request.volumeNo, { grow: true })}</span>
        <span>เลขที่${fill(request.requestNo, { grow: true })}</span>
      </div>
      <div class="center">
        <p class="doc-title">แบบขอยืมเงินทุน</p>
        <p class="doc-title">ของครัวเรือนเป้าหมาย</p>
        <p class="doc-title">ตามโครงการแก้ไขปัญหาความยากจน (กข.คจ.)</p>
      </div>

      <p class="form-item">
        1. ข้าพเจ้า นาย/นาง/นางสาว${fill(`${h.headFirstName} ${h.headLastName}`, { wide: true })}
        อายุ${fill(request.applicantAge)}ปี
      </p>
      <p class="form-line">
        อยู่บ้านเลขที่${fill(h.houseNo)} หมู่ที่${fill(v.villageNo)} บ้าน${fill(v.villageName, { wide: true })}
        ตำบล${fill(addr.subDistrictName, { wide: true })}
      </p>
      <p class="form-line">
        อำเภอ${fill(addr.districtName, { wide: true })} จังหวัด${fill(addr.provinceName, { wide: true })}
        อาชีพ${fill(request.occupation, { wide: true })}
      </p>
      <p class="form-line">
        เป็นครัวเรือนเป้าหมาย ลำดับที่${fill(h.sequenceNo)}
        ในบัญชีจัดลำดับครัวเรือนเป้าหมายโครงการ กข.คจ. ของหมู่บ้าน
      </p>

      <p class="form-item">
        2. มีความประสงค์จะขอยืมเงินทุนจากโครงการแก้ไขปัญหาความยากจน (กข.คจ.) ของหมู่บ้าน
      </p>
      <p class="form-line">
        เป็นเงินทั้งสิ้น${fill(request.requestedAmount.toLocaleString("th-TH"), { grow: true })}บาท
        (${fill(thaiBahtText(request.requestedAmount), { wide: true })})
      </p>

      <p class="form-item">
        3. ในการขอยืมเงินทุน ข้าพเจ้าจะปฏิบัติตามระเบียบกระทรวงมหาดไทยว่าด้วยการบริหาร
        และการใช้จ่ายเงินโครงการแก้ไขปัญหาความยากจน (กข.คจ.) ทุกประการ
      </p>
      <div class="sig-block">
        <p class="sig-line">(ลงชื่อ)${fill("", { wide: true })}ผู้ขอยืม</p>
        <p class="sig-name">(${fill(`${h.headFirstName} ${h.headLastName}`, { wide: true })})</p>
        <p class="sig-line">(ลงชื่อ)${fill("", { wide: true })}ภรรยา/สามี/ทายาท</p>
        <p class="sig-name">(${fill(officials.consentPersonName ?? request.spouseConsentName, { wide: true })}) ผู้ให้คำยินยอม</p>
      </div>

      <p class="form-item">4. ความเห็นของพัฒนากรผู้รับผิดชอบประจำตำบล</p>
      <p class="form-line">${checkbox(request.workerOpinion === "agree", "เห็นชอบ")}</p>
      <p class="form-line">
        ${checkbox(request.workerOpinion === "disagree", "ไม่เห็นชอบ")} เพราะ${fill(request.workerReason, {
    wide: true,
  })}
      </p>
      <div class="sig-block">
        <p class="sig-line">(ลงชื่อ)${fill("", { wide: true })}พัฒนากรผู้รับผิดชอบ</p>
        <p class="sig-name">(${fill(officials.workerName ?? request.workerName, { wide: true })}) ประจำตำบล</p>
        <p class="sig-line">วันที่${fill(formatThaiDate(request.workerDate), { wide: true })}</p>
      </div>
    </div>`;

  const page2 = `
    <div class="page">
      <p class="page-num">- 2 -</p>
      <p class="form-item">5. ผลการพิจารณาอนุมัติเงินยืมของคณะกรรมการ กข.คจ. หมู่บ้าน</p>
      <p class="form-line">
        ${checkbox(request.committeeDecision === "approved", "อนุมัติเป็นจำนวนเงิน")}
        ${fill(request.committeeAmount?.toLocaleString("th-TH"), { grow: true })}บาท
        (${fill(thaiBahtText(request.committeeAmount), { wide: true })})
      </p>
      <p class="form-line">
        ${checkbox(request.committeeDecision === "rejected", "ไม่อนุมัติ")} เพราะ${fill(
    request.committeeReason,
    { wide: true }
  )}
      </p>
      <div class="sig-block">
        <p class="sig-line">(ลงชื่อ)${fill("", { wide: true })}ประธานคณะกรรมการ</p>
        <p class="sig-name">(${fill(officials.chairmanName ?? request.committeeChairName, { wide: true })}) กข.คจ. หมู่บ้าน</p>
        <p class="sig-line">วันที่${fill(formatThaiDate(request.committeeDate), { wide: true })}</p>
      </div>

      <p class="footnote"><u>หมายเหตุ</u> แบบแนบท้ายระเบียบกระทรวงมหาดไทยฯ พ.ศ.2553 หมวด 4 ข้อ 16</p>
    </div>`;

  return documentShell(page1 + page2);
}
