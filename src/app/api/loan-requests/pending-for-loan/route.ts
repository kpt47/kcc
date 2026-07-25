import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, canAccessHouseholdRecord } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canCreateOrUpdateLoan } from "@/lib/authz";

// ให้เลขานุการค้นหาแบบขอยืมเงินทุน (ฟอร์ม 2) ที่อนุมัติแล้วและยังไม่ได้ทำสัญญาเงินยืม ของครัวเรือนที่เลือกไว้
// ที่หน้า "บันทึกรายการยืมเงินใหม่" — เพื่อดึงจำนวนเงิน/ผูกสัญญากับแบบขอยืมเงินทุนนั้นอัตโนมัติ (ไม่บังคับ เผื่อ
// ครัวเรือนที่ไม่ได้ผ่านขั้นตอนดิจิทัลเต็มรูปแบบยังบันทึกสัญญาเงินยืมตรงได้ตามเดิม)
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canCreateOrUpdateLoan(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const householdId = Number(searchParams.get("householdId"));
  if (!Number.isInteger(householdId) || householdId <= 0) {
    return NextResponse.json({ error: { formErrors: ["กรุณาระบุครัวเรือนเป้าหมาย"] } }, { status: 400 });
  }

  const household = await prisma.targetHousehold.findUnique({ where: { id: householdId } });
  if (!household) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบครัวเรือนเป้าหมายที่เลือก"] } }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (!canAccessHouseholdRecord(user, scope, household)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const [loanRequest, loanCount] = await Promise.all([
    prisma.loanRequest.findFirst({
      where: { householdId, committeeDecision: "approved", loan: null },
      select: { id: true, requestedAmount: true, occupation: true, repaymentDueDate: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.loan.count({ where: { householdId } }),
  ]);

  if (!loanRequest) {
    return NextResponse.json({ loanRequestId: null, suggestedBorrowRound: loanCount + 1 });
  }

  return NextResponse.json({
    loanRequestId: loanRequest.id,
    suggestedAmount: loanRequest.requestedAmount,
    suggestedOccupation: loanRequest.occupation,
    suggestedDueDate: loanRequest.repaymentDueDate,
    suggestedBorrowRound: loanCount + 1,
  });
}
