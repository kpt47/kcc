import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderPdf } from "@/lib/pdf/render";
import { renderProposalHtml } from "@/lib/pdf/templates/proposalPdf";
import { VILLAGE_ADDRESS_INCLUDE } from "@/lib/geo";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, canAccessHouseholdRecord } from "@/lib/scope";
import { findChairmanName, findSubDistrictAdminName } from "@/lib/officials";

export const maxDuration = 30; // ให้เวลา Chromium (@sparticuz/chromium บน Vercel) เพียงพอสำหรับ cold start

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const { id } = await params;
  const proposal = await prisma.projectProposal.findUnique({
    where: { id: Number(id) },
    include: { items: true, household: { include: { village: { include: VILLAGE_ADDRESS_INCLUDE } } } },
  });
  if (!proposal) {
    return NextResponse.json({ error: "ไม่พบแบบเสนอโครงการที่ระบุ" }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (!canAccessHouseholdRecord(user, scope, proposal.household)) {
    return NextResponse.json({ error: "ไม่พบแบบเสนอโครงการที่ระบุ" }, { status: 404 });
  }

  const [chairmanName, workerName] = await Promise.all([
    findChairmanName(proposal.household.village.id),
    findSubDistrictAdminName(proposal.household.village.subDistrictId),
  ]);

  const pdf = await renderPdf(renderProposalHtml(proposal, { chairmanName, workerName }));
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="proposal-${proposal.id}.pdf"`,
    },
  });
}
