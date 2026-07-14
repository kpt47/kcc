import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { editBankTransactionSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canEditOrDeleteBankTransaction } from "@/lib/authz";
import { recomputeBankAccountBalances } from "@/lib/ledger";

async function loadInScopeTransaction(transactionId: number, scope: Awaited<ReturnType<typeof getAllowedVillageIds>>) {
  const transaction = await prisma.bankTransaction.findUnique({
    where: { id: transactionId },
    include: { bankAccount: true },
  });
  if (!transaction) return { transaction: null, inScope: false };
  const inScope = scope === "all" || scope.includes(transaction.bankAccount.villageId);
  return { transaction, inScope };
}

// แก้ไขรายการฝาก-ถอน (เล่มเขียว) — เฉพาะฝ่ายการเงิน (ผู้บันทึก) หรือประธาน (ผู้ตรวจสอบ) เท่านั้น
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canEditOrDeleteBankTransaction(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id } = await params;
  const transactionId = Number(id);
  const scope = await getAllowedVillageIds(user);
  const { transaction, inScope } = await loadInScopeTransaction(transactionId, scope);
  if (!transaction) return NextResponse.json({ error: { formErrors: ["ไม่พบรายการที่ระบุ"] } }, { status: 404 });
  if (!inScope) return NextResponse.json({ error: { formErrors: ["คุณไม่มีสิทธิ์แก้ไขรายการนี้"] } }, { status: 403 });

  const body = await request.json();
  const parsed = editBankTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  await prisma.bankTransaction.update({
    where: { id: transactionId },
    data: {
      transactionDate: data.transactionDate ? new Date(data.transactionDate) : undefined,
      documentNo: data.documentNo,
      description: data.description,
      depositAmount: data.depositAmount,
      withdrawAmount: data.withdrawAmount,
      note: data.note,
      passbookImageUrl: data.passbookImageUrl,
    },
  });
  await recomputeBankAccountBalances(transaction.bankAccountId);

  const updated = await prisma.bankTransaction.findUniqueOrThrow({ where: { id: transactionId } });
  return NextResponse.json(updated);
}

// ลบรายการฝาก-ถอน (เล่มเขียว) — Hard delete ตามคำขอ (ไม่ใช่บัญชีผู้ใช้งานที่ต้อง soft delete)
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canEditOrDeleteBankTransaction(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id } = await params;
  const transactionId = Number(id);
  const scope = await getAllowedVillageIds(user);
  const { transaction, inScope } = await loadInScopeTransaction(transactionId, scope);
  if (!transaction) return NextResponse.json({ error: { formErrors: ["ไม่พบรายการที่ระบุ"] } }, { status: 404 });
  if (!inScope) return NextResponse.json({ error: { formErrors: ["คุณไม่มีสิทธิ์ลบรายการนี้"] } }, { status: 403 });

  await prisma.bankTransaction.delete({ where: { id: transactionId } });
  await recomputeBankAccountBalances(transaction.bankAccountId);

  return NextResponse.json({ ok: true });
}
