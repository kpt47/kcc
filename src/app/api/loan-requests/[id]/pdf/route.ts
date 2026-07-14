import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderPdf } from "@/lib/pdf/render";
import { renderLoanRequestHtml } from "@/lib/pdf/templates/loanRequestPdf";
import { VILLAGE_ADDRESS_INCLUDE } from "@/lib/geo";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, canAccessHouseholdRecord } from "@/lib/scope";
import { findChairmanName, findSubDistrictAdminName } from "@/lib/officials";

export const maxDuration = 30; // ให้เวลา Chromium (@sparticuz/chromium บน Vercel) เพียงพอสำหรับ cold start

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const { id } = await params;
  const loanRequest = await prisma.loanRequest.findUnique({
    where: { id: Number(id) },
    include: { household: { include: { village: { include: VILLAGE_ADDRESS_INCLUDE } } } },
  });
  if (!loanRequest) {
    return NextResponse.json({ error: "ไม่พบแบบขอยืมเงินทุนที่ระบุ" }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (!canAccessHouseholdRecord(user, scope, loanRequest.household)) {
    return NextResponse.json({ error: "ไม่พบแบบขอยืมเงินทุนที่ระบุ" }, { status: 404 });
  }

  const [chairmanName, workerName, householdProfile] = await Promise.all([
    findChairmanName(loanRequest.household.village.id),
    findSubDistrictAdminName(loanRequest.household.village.subDistrictId),
    prisma.householdProfile.findFirst({ where: { user: { householdId: loanRequest.householdId } } }),
  ]);

  const pdf = await renderPdf(
    renderLoanRequestHtml(loanRequest, {
      chairmanName,
      workerName,
      consentPersonName: householdProfile?.consentPersonName ?? null,
    })
  );
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="loan-request-${loanRequest.id}.pdf"`,
    },
  });
}
