import { documentShell, fill, checkbox, thaiDateBlank, OFFICIAL_FORM_STYLE } from "../layout";
import { thaiBahtText } from "@/lib/thai";
import { VILLAGE_ADDRESS_INCLUDE, villageAddress } from "@/lib/geo";
import type { Prisma } from "@/generated/prisma/client";

export type ProposalForPdf = Prisma.ProjectProposalGetPayload<{
  include: {
    items: true;
    household: { include: { village: { include: typeof VILLAGE_ADDRESS_INCLUDE } } };
  };
}>;

export type ProposalPdfOfficials = {
  workerName: string | null; // พัฒนากรผู้รับผิดชอบประจำตำบล — ค้นหาตามพื้นที่จริง (ดู lib/officials.ts)
  chairmanName: string | null; // ประธานคณะกรรมการ กข.คจ. หมู่บ้าน — ค้นหาตามพื้นที่จริง
};

// จัดหน้าให้ตรงกับต้นฉบับ "แบบเสนอโครงการของครัวเรือนเป้าหมาย" (แบบแนบท้ายระเบียบกระทรวงมหาดไทยฯ พ.ศ. 2553
// หมวด 4 ข้อ 16) ทุกประการ ทั้งถ้อยคำ/ลำดับหัวข้อ/รูปแบบวันที่ (วันที่...เดือน...พ.ศ....) — อัดให้พอดี A4 หน้าเดียว
// (ดู OFFICIAL_FORM_STYLE ใน lib/pdf/layout.ts) โดยไม่ตัดเนื้อหาใดออกเลย
// หมายเหตุ: ต้นฉบับใช้ "ผู้เสนอโครงการ" สอดคล้องกันตลอดทั้งฟอร์ม (บางสำเนาของต้นฉบับพิมพ์ผิดเป็น "ผู้ขอยืม" ตรง
// ช่องลงชื่อ ซึ่งไม่ตรงกับหัวข้อ 1 — แก้ไขให้สอดคล้องกันในเทมเพลตนี้)
export function renderProposalHtml(proposal: ProposalForPdf, officials: ProposalPdfOfficials): string {
  const h = proposal.household;
  const v = h.village;
  const addr = villageAddress(v);

  const body = `
    <div class="page">
      <div class="top-row">
        <span>เล่มที่${fill(proposal.volumeNo, { grow: true })}</span>
        <span>โครงการที่${fill(proposal.proposalNo, { grow: true })}</span>
      </div>
      <div class="center">
        <p class="doc-title">แบบเสนอโครงการของครัวเรือนเป้าหมาย</p>
        <p class="doc-title">ตามโครงการแก้ไขปัญหาความยากจน(กข.คจ.)</p>
      </div>

      <p class="form-item">
        1. ผู้เสนอโครงการ นาย/นาง/นางสาว${fill(`${h.headFirstName} ${h.headLastName}`, { wide: true })}
        หมายเลขบัตรประจำตัวประชาชน${fill(null, { wide: true })}
      </p>
      <p class="form-line">
        อยู่บ้านเลขที่${fill(h.houseNo)} หมู่ที่${fill(v.villageNo)} บ้าน${fill(v.villageName, { wide: true })}
        ตำบล${fill(addr.subDistrictName, { wide: true })}
      </p>
      <p class="form-line">
        อำเภอ${fill(addr.districtName, { wide: true })} จังหวัด${fill(addr.provinceName, { wide: true })}
        อาชีพ${fill(proposal.occupation, { wide: true })}
      </p>
      <p class="form-line">
        เป็นครัวเรือนเป้าหมาย ลำดับที่${fill(h.sequenceNo)} ในบัญชีจัดลำดับครัวเรือนเป้าหมายตามโครงการแก้ไขปัญหา
        ความยากจน (กข.คจ.)ของหมู่บ้าน
      </p>

      <p class="form-item">2. เสนอโครงการ${fill(proposal.projectName, { wide: true })}</p>
      <p class="form-line">
        เป็นเงินทั้งสิ้น${fill(proposal.totalAmount.toLocaleString("th-TH"), { grow: true })}บาท
        (${fill(thaiBahtText(proposal.totalAmount), { wide: true })})
      </p>
      <p class="form-line">เพื่อนำไปดำเนินการตามโครงการ (ระบุรายการและจำนวนเงิน) ดังนี้</p>
      ${proposal.items
        .map(
          (item) => `
      <p class="form-line" style="margin-left: 3em;">
        2.${item.itemNo} ${fill(item.description, { wide: true })}
        เป็นเงิน${fill(item.amount.toLocaleString("th-TH"), { grow: true })}บาท
      </p>`
        )
        .join("")}

      <div class="sig-block">
        <p class="sig-line">(ลงชื่อ)${fill("", { wide: true })}ผู้เสนอโครงการ</p>
        <p class="sig-name">(${fill(`${h.headFirstName} ${h.headLastName}`, { wide: true })})</p>
        <p class="sig-line">${thaiDateBlank(proposal.proposedDate)}</p>
      </div>

      <p class="form-item">3. ความเห็นของพัฒนากรผู้รับผิดชอบประจำตำบล</p>
      <p class="form-line">${checkbox(proposal.workerOpinion === "possible", "เห็นชอบ")}</p>
      <p class="form-line">${checkbox(proposal.workerOpinion === "not_possible", "ไม่เห็นชอบ")}</p>
      <div class="sig-block">
        <p class="sig-line">(ลงชื่อ)${fill("", { wide: true })}พัฒนากรผู้รับผิดชอบประจำตำบล</p>
        <p class="sig-name">(${fill(officials.workerName ?? proposal.workerName, { wide: true })})</p>
        <p class="sig-line">${thaiDateBlank(proposal.workerDate)}</p>
      </div>

      <p class="form-item">4. ผลการพิจารณาอนุมัติเงินยืมของคณะกรรมการกองทุน กข.คจ. ประจำหมู่บ้าน</p>
      <p class="form-line">
        ${checkbox(proposal.committeeDecision === "approved", "อนุมัติ")}
        เป็นจำนวนเงิน${fill(proposal.committeeAmount?.toLocaleString("th-TH"), { grow: true })}บาท
        (${fill(thaiBahtText(proposal.committeeAmount), { wide: true })})
      </p>
      <p class="form-line">
        ${checkbox(proposal.committeeDecision === "rejected", "ไม่อนุมัติ")}เพราะ${fill(
    proposal.committeeReason,
    { wide: true }
  )}
      </p>
      <div class="sig-block">
        <p class="sig-line">(ลงชื่อ)${fill("", { wide: true })}ประธานคณะกรรมการ กข.คจ.หมู่บ้าน</p>
        <p class="sig-name">(${fill(officials.chairmanName ?? proposal.committeeChairName, { wide: true })})</p>
        <p class="sig-line">${thaiDateBlank(proposal.committeeDate)}</p>
      </div>
    </div>`;

  return documentShell(body, { extraStyle: OFFICIAL_FORM_STYLE });
}
