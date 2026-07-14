import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { editLoanRepaymentSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, canAccessHouseholdRecord } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canEditOrDeleteRepayment } from "@/lib/authz";
import { recomputeLoanBalance } from "@/lib/ledger";

async function loadInScopeRepayment(
  loanId: number,
  repaymentId: number,
  scope: Awaited<ReturnType<typeof getAllowedVillageIds>>,
  user: Awaited<ReturnType<typeof getCurrentUser>>
) {
  const loan = await prisma.loan.findUnique({ where: { id: loanId }, include: { household: true } });
  if (!loan) return { loan: null, repayment: null, inScope: false };
  const repayment = await prisma.loanRepayment.findUnique({ where: { id: repaymentId } });
  if (!repayment || repayment.loanId !== loanId) return { loan, repayment: null, inScope: false };
  const inScope = user !== null && canAccessHouseholdRecord(user, scope, loan.household);
  return { loan, repayment, inScope };
}

// แก้ไขรายการรับชำระเงินค่างวด (เล่มเหลือง) — เลขานุการ/ฝ่ายการเงินขึ้นไปเท่านั้น คำนวณยอดค้างชำระใหม่หลังบันทึก
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; repaymentId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canEditOrDeleteRepayment(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id, repaymentId } = await params;
  const loanId = Number(id);
  const scope = await getAllowedVillageIds(user);
  const { repayment, inScope } = await loadInScopeRepayment(loanId, Number(repaymentId), scope, user);
  if (!repayment) return NextResponse.json({ error: { formErrors: ["ไม่พบรายการรับชำระที่ระบุ"] } }, { status: 404 });
  if (!inScope) return NextResponse.json({ error: { formErrors: ["คุณไม่มีสิทธิ์แก้ไขรายการนี้"] } }, { status: 403 });

  const body = await request.json();
  const parsed = editLoanRepaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  await prisma.loanRepayment.update({
    where: { id: repayment.id },
    data: {
      amount: data.amount,
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : undefined,
      receiptNo: data.receiptNo,
      note: data.note,
      transferSlipUrl: data.transferSlipUrl,
    },
  });
  await recomputeLoanBalance(loanId);

  const updated = await prisma.loanRepayment.findUniqueOrThrow({ where: { id: repayment.id } });
  return NextResponse.json(updated);
}

// ลบรายการรับชำระเงินค่างวด — คำนวณยอดค้างชำระ (และสถานะปิดสัญญา) ใหม่หลังลบเสมอ
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; repaymentId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canEditOrDeleteRepayment(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id, repaymentId } = await params;
  const loanId = Number(id);
  const scope = await getAllowedVillageIds(user);
  const { repayment, inScope } = await loadInScopeRepayment(loanId, Number(repaymentId), scope, user);
  if (!repayment) return NextResponse.json({ error: { formErrors: ["ไม่พบรายการรับชำระที่ระบุ"] } }, { status: 404 });
  if (!inScope) return NextResponse.json({ error: { formErrors: ["คุณไม่มีสิทธิ์ลบรายการนี้"] } }, { status: 403 });

  await prisma.loanRepayment.delete({ where: { id: repayment.id } });
  await recomputeLoanBalance(loanId);

  return NextResponse.json({ ok: true });
}
