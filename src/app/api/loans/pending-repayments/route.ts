import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canCreateRepayment } from "@/lib/authz";

// รายการแจ้งชำระเงินที่รอตรวจสอบ (PENDING) ในขอบเขตพื้นที่ของผู้ใช้งาน — สำหรับแท็บ "รายการรอตรวจสอบ"
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canCreateRepayment(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const scope = await getAllowedVillageIds(user);
  const villageFilter = scope === "all" ? {} : { household: { villageId: { in: scope } } };

  const pending = await prisma.loanRepayment.findMany({
    where: { status: "PENDING", loan: villageFilter },
    orderBy: { createdAt: "asc" },
    include: {
      loan: {
        select: {
          id: true,
          borrowRound: true,
          household: { select: { headFirstName: true, headLastName: true } },
        },
      },
    },
  });

  return NextResponse.json(pending);
}
