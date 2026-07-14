import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { canSignBankTransactionAsChairman, canSignBankTransactionAsFinance, isBankTransactionFullyApproved } from "@/lib/authz";

const signSchema = z.object({
  as: z.enum(["chairman", "finance"]),
});

// บัญชีคุมเงินฝาก (เล่มเขียว) — Multi-signature: รายการถอนต้องมีลายเซ็นจาก CHAIRMAN 1 เสียง
// และ FINANCE_MEMBER อย่างน้อย 1 เสียง คนละคนกัน จึงจะถือว่าอนุมัติสมบูรณ์
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const { id } = await params;
  const transactionId = Number(id);

  const transaction = await prisma.bankTransaction.findUnique({
    where: { id: transactionId },
    include: { bankAccount: true },
  });
  if (!transaction) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบรายการที่ระบุ"] } }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (scope !== "all" && !scope.includes(transaction.bankAccount.villageId)) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบรายการที่ระบุ"] } }, { status: 404 });
  }

  const body = await request.json();
  const parsed = signSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.as === "chairman") {
    if (!canSignBankTransactionAsChairman(user)) {
      return NextResponse.json(
        { error: { formErrors: ["เฉพาะประธานคณะกรรมการหมู่บ้านขึ้นไปเท่านั้นที่ลงนามในฐานะนี้ได้"] } },
        { status: 403 }
      );
    }
    if (transaction.chairmanApprovedById !== null) {
      return NextResponse.json({ error: { formErrors: ["มีการลงนามในฐานะประธานแล้ว"] } }, { status: 409 });
    }
    if (transaction.financeApprovedById === user.id) {
      return NextResponse.json(
        { error: { formErrors: ["ต้องลงนามคนละคนกับผู้ลงนามในฐานะกรรมการเงินทุน"] } },
        { status: 409 }
      );
    }
    const updated = await prisma.bankTransaction.update({
      where: { id: transactionId },
      data: { chairmanApprovedById: user.id, chairmanApprovedAt: new Date() },
    });
    return NextResponse.json({ ...updated, isFullyApproved: isBankTransactionFullyApproved(updated) });
  }

  // as === "finance"
  if (!canSignBankTransactionAsFinance(user)) {
    return NextResponse.json(
      { error: { formErrors: ["เฉพาะกรรมการเงินทุนขึ้นไปเท่านั้นที่ลงนามในฐานะนี้ได้"] } },
      { status: 403 }
    );
  }
  if (transaction.financeApprovedById !== null) {
    return NextResponse.json({ error: { formErrors: ["มีการลงนามในฐานะกรรมการเงินทุนแล้ว"] } }, { status: 409 });
  }
  if (transaction.chairmanApprovedById === user.id) {
    return NextResponse.json(
      { error: { formErrors: ["ต้องลงนามคนละคนกับผู้ลงนามในฐานะประธาน"] } },
      { status: 409 }
    );
  }
  const updated = await prisma.bankTransaction.update({
    where: { id: transactionId },
    data: { financeApprovedById: user.id, financeApprovedAt: new Date() },
  });
  return NextResponse.json({ ...updated, isFullyApproved: isBankTransactionFullyApproved(updated) });
}
