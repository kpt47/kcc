import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderPdf } from "@/lib/pdf/render";
import { renderPaymentVoucherHtml } from "@/lib/pdf/templates/paymentVoucherPdf";
import { VILLAGE_ADDRESS_INCLUDE } from "@/lib/geo";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, canAccessHouseholdRecord } from "@/lib/scope";
import { findChairmanName } from "@/lib/officials";

export const maxDuration = 30; // ให้เวลา Chromium (@sparticuz/chromium บน Vercel) เพียงพอสำหรับ cold start

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const { id } = await params;
  const loan = await prisma.loan.findUnique({
    where: { id: Number(id) },
    include: { household: { include: { village: { include: VILLAGE_ADDRESS_INCLUDE } } } },
  });
  if (!loan) {
    return NextResponse.json({ error: "ไม่พบรายการยืมเงินที่ระบุ" }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (!canAccessHouseholdRecord(user, scope, loan.household)) {
    return NextResponse.json({ error: "ไม่พบรายการยืมเงินที่ระบุ" }, { status: 404 });
  }

  const chairmanName = await findChairmanName(loan.household.village.id);

  const pdf = await renderPdf(renderPaymentVoucherHtml(loan, { chairmanName }));
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="payment-voucher-${loan.id}.pdf"`,
    },
  });
}
