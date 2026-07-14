import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canApproveLoan } from "@/lib/authz";

const approveLoanSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
});

// บัญชีคุมลูกหนี้ (เล่มเหลือง): ประธานคณะกรรมการ (CHAIRMAN) เป็นผู้อนุมัติ
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canApproveLoan(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id } = await params;
  const loanId = Number(id);

  const loan = await prisma.loan.findUnique({ where: { id: loanId }, include: { household: true } });
  if (!loan) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบรายการยืมเงินที่ระบุ"] } }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (scope !== "all" && !scope.includes(loan.household.villageId)) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบรายการยืมเงินที่ระบุ"] } }, { status: 404 });
  }

  const body = await request.json();
  const parsed = approveLoanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.loan.update({
    where: { id: loanId },
    data: { approvalStatus: parsed.data.decision, approvedById: user.id, approvedAt: new Date() },
  });

  return NextResponse.json(updated);
}
