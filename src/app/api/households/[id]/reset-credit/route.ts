import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { canResetCreditStatus } from "@/lib/authz";

// รีเซ็ตสถานะเครดิต (riskStatus) ของเงินยืมทุกก้อนที่ยังไม่ปิดสัญญาของครัวเรือนนี้กลับเป็น NORMAL ด้วยตนเอง
// ใช้กรณีมีการประนอมหนี้ — ห้ามเลขานุการ/ฝ่ายการเงินหมู่บ้านเรียกใช้เด็ดขาด (ดู canResetCreditStatus)
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canResetCreditStatus(user)) {
    return NextResponse.json(
      { error: { formErrors: ["เฉพาะประธานคณะกรรมการหมู่บ้านขึ้นไป (พัฒนากร, อำเภอ, จังหวัด, ส่วนกลาง) เท่านั้นที่รีเซ็ตสถานะเครดิตได้"] } },
      { status: 403 }
    );
  }

  const { id } = await params;
  const householdId = Number(id);

  const household = await prisma.targetHousehold.findUnique({ where: { id: householdId } });
  if (!household) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบครัวเรือนเป้าหมายที่ระบุ"] } }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (scope !== "all" && !scope.includes(household.villageId)) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบครัวเรือนเป้าหมายที่ระบุ"] } }, { status: 404 });
  }

  const { count } = await prisma.loan.updateMany({
    where: { householdId, isClosed: false },
    data: { riskStatus: "NORMAL" },
  });

  return NextResponse.json({ ok: true, loansReset: count });
}
