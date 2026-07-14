import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bankTransactionEntrySchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canCreateBankTransaction } from "@/lib/authz";
import { recomputeBankAccountBalances } from "@/lib/ledger";

// บัญชีคุมเงินฝาก (เล่มเขียว): บันทึกรายการฝาก-ถอน — รายการถอนต้องผ่านการอนุมัติ Multi-signature
// เพิ่มเติม (ดู /api/bank-transactions/[id]/approve) ก่อนถือว่าสมบูรณ์
// ยอดคงเหลือ (balance) คำนวณจากฝั่งเซิร์ฟเวอร์เสมอ — ไม่รับค่าจาก client เพื่อป้องกันยอดผิดพลาด/ถูกปลอมแปลง
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canCreateBankTransaction(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = bankTransactionEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const bankAccount = await prisma.bankAccount.findUnique({ where: { id: data.bankAccountId } });
  if (!bankAccount) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบบัญชีเงินฝากที่ระบุ"] } }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (scope !== "all" && !scope.includes(bankAccount.villageId)) {
    return NextResponse.json({ error: { formErrors: ["คุณไม่มีสิทธิ์บันทึกรายการในบัญชีนี้"] } }, { status: 403 });
  }

  const latestTransaction = await prisma.bankTransaction.findFirst({
    where: { bankAccountId: data.bankAccountId },
    orderBy: [{ transactionDate: "desc" }, { id: "desc" }],
  });
  const previousBalance = latestTransaction?.balance ?? 0;
  const newBalance = previousBalance + data.depositAmount - data.withdrawAmount;

  if (newBalance < 0) {
    return NextResponse.json(
      { error: { formErrors: [`ยอดถอนเกินยอดคงเหลือในบัญชี (คงเหลือปัจจุบัน ${previousBalance.toLocaleString("th-TH")} บาท)`] } },
      { status: 400 }
    );
  }

  const transaction = await prisma.bankTransaction.create({
    data: {
      bankAccountId: data.bankAccountId,
      transactionDate: new Date(data.transactionDate),
      documentNo: data.documentNo,
      description: data.description,
      depositAmount: data.depositAmount,
      withdrawAmount: data.withdrawAmount,
      balance: newBalance,
      note: data.note,
      passbookImageUrl: data.passbookImageUrl,
    },
  });
  // คำนวณยอดคงเหลือทั้งเชนใหม่อีกครั้ง เผื่อกรณีรายการนี้ไม่ใช่รายการล่าสุดตามลำดับเวลาจริง (บันทึกย้อนหลัง)
  await recomputeBankAccountBalances(data.bankAccountId);

  const finalTransaction = await prisma.bankTransaction.findUniqueOrThrow({ where: { id: transaction.id } });
  return NextResponse.json(finalTransaction, { status: 201 });
}
