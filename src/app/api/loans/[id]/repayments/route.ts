import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loanRepaymentSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, canAccessHouseholdRecord } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canCreateRepayment } from "@/lib/authz";
import { recomputeLoanBalance } from "@/lib/ledger";

// บัญชีคุมลูกหนี้ (เล่มเหลือง): บันทึกรับชำระเงินค่างวด — เลขานุการ (คีย์บัญชี) หรือฝ่ายการเงิน (ออกใบเสร็จ)
// ทำได้ทั้งคู่ — หักยอดค้างชำระอัตโนมัติ และปิดสัญญาอัตโนมัติเมื่อยอดคงเหลือเป็น 0
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canCreateRepayment(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id } = await params;
  const loan = await prisma.loan.findUnique({
    where: { id: Number(id) },
    include: { household: true },
  });
  if (!loan) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบรายการเงินยืมที่ระบุ"] } }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (!canAccessHouseholdRecord(user, scope, loan.household)) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบรายการเงินยืมที่ระบุ"] } }, { status: 404 });
  }

  if (loan.isClosed) {
    return NextResponse.json({ error: { formErrors: ["ปิดสัญญาเงินยืมนี้แล้ว ไม่สามารถบันทึกรับชำระเพิ่มได้"] } }, { status: 409 });
  }

  const body = await request.json();
  const parsed = loanRepaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // เลขาฯ/ฝ่ายการเงินคีย์ตรงเข้าสมุดบัญชี ถือว่าอนุมัติทันที (ต่างจากครัวเรือนแจ้งชำระเองที่ต้องรอตรวจสอบ)
  const repayment = await prisma.loanRepayment.create({
    data: {
      loanId: loan.id,
      amount: data.amount,
      paymentDate: new Date(data.paymentDate),
      receiptNo: data.receiptNo,
      note: data.note,
      transferSlipUrl: data.transferSlipUrl,
      status: "APPROVED",
    },
  });
  await recomputeLoanBalance(loan.id);
  // การรับชำระเงินถือเป็นเหตุการณ์ "อนุมัติรับชำระเงิน" — รีเซ็ตสถานะเครดิตกลับเป็นปกติเสมอ
  await prisma.loan.update({ where: { id: loan.id }, data: { riskStatus: "NORMAL" } });
  const updatedLoan = await prisma.loan.findUniqueOrThrow({ where: { id: loan.id } });

  return NextResponse.json({ repayment, loan: updatedLoan }, { status: 201 });
}
