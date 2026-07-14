import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderPdf } from "@/lib/pdf/render";
import { renderHouseholdRegisterHtml } from "@/lib/pdf/templates/householdRegisterPdf";
import { VILLAGE_ADDRESS_INCLUDE } from "@/lib/geo";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";

export const maxDuration = 30; // ให้เวลา Chromium (@sparticuz/chromium บน Vercel) เพียงพอสำหรับ cold start

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const { id } = await params;
  const villageId = Number(id);
  const scope = await getAllowedVillageIds(user);
  if (scope !== "all" && !scope.includes(villageId)) {
    return NextResponse.json({ error: "ไม่พบหมู่บ้านที่ระบุ" }, { status: 404 });
  }

  const village = await prisma.village.findUnique({
    where: { id: villageId },
    include: { households: { include: { incomeRecords: true, loans: true } }, ...VILLAGE_ADDRESS_INCLUDE },
  });
  if (!village) {
    return NextResponse.json({ error: "ไม่พบหมู่บ้านที่ระบุ" }, { status: 404 });
  }

  const pdf = await renderPdf(renderHouseholdRegisterHtml(village), { landscape: true });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="household-register-village-${village.id}.pdf"`,
    },
  });
}
