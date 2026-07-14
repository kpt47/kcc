import { documentShell, fill, checkbox } from "../layout";
import { formatThaiDate, thaiBahtText } from "@/lib/thai";
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

// จัดหน้าให้ตรงกับ "1 แบบเสนอโครงการ กข.คจ..pdf" (แบบแนบท้ายระเบียบกระทรวงมหาดไทยฯ พ.ศ. 2553 หมวด 4 ข้อ 16)
export function renderProposalHtml(proposal: ProposalForPdf, officials: ProposalPdfOfficials): string {
  const h = proposal.household;
  const v = h.village;
  const addr = villageAddress(v);

  const page1 = `
    <div class="page">
      <div class="top-row">
        <span>เล่มที่${fill(proposal.volumeNo, { grow: true })}</span>
        <span>โครงการที่${fill(proposal.proposalNo, { grow: true })}</span>
      </div>
      <div class="center">
        <p class="doc-title">แบบเสนอโครงการ</p>
        <p class="doc-title">ของครัวเรือนเป้าหมาย</p>
        <p class="doc-title">ตามโครงการแก้ไขปัญหาความยากจน (กข.คจ.)</p>
      </div>

      <p class="form-item">
        1. ผู้เสนอโครงการ นาย/นาง/นางสาว${fill(`${h.headFirstName} ${h.headLastName}`, { wide: true })}
        อายุ${fill(proposal.applicantAge)}ปี
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
        เป็นครัวเรือนเป้าหมาย ลำดับที่${fill(h.sequenceNo)}
        ในบัญชีจัดลำดับครัวเรือนเป้าหมายโครงการ กข.คจ. ของหมู่บ้าน
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
        <p class="sig-line">วันที่${fill(formatThaiDate(proposal.proposedDate), { wide: true })}</p>
      </div>

      <p class="form-item">3. ความเห็นของพัฒนากรผู้รับผิดชอบประจำตำบล</p>
      <p class="form-line">${checkbox(proposal.workerOpinion === "possible", "เป็นไปได้")}</p>
      <p class="form-line">
        ${checkbox(proposal.workerOpinion === "not_possible", "เป็นไปไม่ได้")} (ระบุเหตุผล)${fill(
    proposal.workerReason,
    { wide: true }
  )}
      </p>
      <div class="sig-block">
        <p class="sig-line">(ลงชื่อ)${fill("", { wide: true })}พัฒนากรผู้รับผิดชอบ</p>
        <p class="sig-name">(${fill(officials.workerName ?? proposal.workerName, { wide: true })}) ประจำตำบล</p>
        <p class="sig-line">วันที่${fill(formatThaiDate(proposal.workerDate), { wide: true })}</p>
      </div>
    </div>`;

  const page2 = `
    <div class="page">
      <p class="page-num">- 2 -</p>
      <p class="form-item">4. ผลการพิจารณาอนุมัติโครงการของคณะกรรมการ กข.คจ. หมู่บ้าน</p>
      <p class="form-line">
        ${checkbox(proposal.committeeDecision === "approved", "อนุมัติโครงการ")}
        จำนวนเงิน${fill(proposal.committeeAmount?.toLocaleString("th-TH"), { grow: true })}บาท
        (${fill(thaiBahtText(proposal.committeeAmount), { wide: true })})
      </p>
      <p class="form-line">
        ${checkbox(proposal.committeeDecision === "rejected", "ไม่อนุมัติ")} เพราะ${fill(
    proposal.committeeReason,
    { wide: true }
  )}
      </p>
      <div class="sig-block">
        <p class="sig-line">(ลงชื่อ)${fill("", { wide: true })}ประธานคณะกรรมการ</p>
        <p class="sig-name">(${fill(officials.chairmanName ?? proposal.committeeChairName, { wide: true })}) กข.คจ.หมู่บ้าน</p>
        <p class="sig-line">วันที่${fill(formatThaiDate(proposal.committeeDate), { wide: true })}</p>
      </div>

      <p class="footnote"><u>หมายเหตุ</u> แบบแนบท้ายระเบียบกระทรวงมหาดไทยฯ พ.ศ.2553 หมวด 4 ข้อ 16</p>
    </div>`;

  return documentShell(page1 + page2);
}
