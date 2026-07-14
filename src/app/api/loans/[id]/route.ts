import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canCreateOrUpdateLoan } from "@/lib/authz";

const updateLoanSchema = z.object({
  contractNo: z.string().optional(),
  amount: z.number().positive().optional(),
  receivedDate: z.string().min(1).optional(),
  dueDate: z.string().optional(),
  occupation: z.string().optional(),
  outstandingBalance: z.number().min(0).optional(),
  isClosed: z.boolean().optional(),
});

// บัญชีคุมลูกหนี้ (เล่มเหลือง): เลขานุการ (SECRETARY) เป็นผู้แก้ไขรายการยืมเงิน
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canCreateOrUpdateLoan(user)) {
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
  const parsed = updateLoanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { receivedDate, dueDate, ...rest } = parsed.data;

  const updated = await prisma.loan.update({
    where: { id: loanId },
    data: {
      ...rest,
      receivedDate: receivedDate ? new Date(receivedDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    },
  });

  return NextResponse.json(updated);
}
