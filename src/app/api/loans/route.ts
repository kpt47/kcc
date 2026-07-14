import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newLoanSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, canAccessHouseholdRecord } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canCreateOrUpdateLoan } from "@/lib/authz";

// บัญชีคุมลูกหนี้ (เล่มเหลือง): เลขานุการ (SECRETARY) เท่านั้นเป็นผู้บันทึกรายการยืมเงินใหม่
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canCreateOrUpdateLoan(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = newLoanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const household = await prisma.targetHousehold.findUnique({ where: { id: data.householdId } });
  if (!household) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบครัวเรือนเป้าหมายที่เลือก"] } }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (!canAccessHouseholdRecord(user, scope, household)) {
    return NextResponse.json({ error: { formErrors: ["คุณไม่มีสิทธิ์บันทึกรายการยืมเงินให้ครัวเรือนนี้"] } }, { status: 403 });
  }

  const loan = await prisma.loan.create({
    data: {
      householdId: data.householdId,
      borrowRound: data.borrowRound,
      contractNo: data.contractNo,
      amount: data.amount,
      receivedDate: new Date(data.receivedDate),
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      occupation: data.occupation,
      outstandingBalance: data.amount,
    },
  });

  return NextResponse.json(loan, { status: 201 });
}
