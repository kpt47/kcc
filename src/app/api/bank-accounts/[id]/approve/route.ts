import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { canSignBankAccountAsChairman, canSignBankAccountAsFinance, isBankAccountFullyApproved } from "@/lib/authz";

const signSchema = z.object({
  as: z.enum(["chairman", "finance"]),
});

// บัญชีคุมเงินฝาก (เล่มเขียว) — Multi-signature: การเปิดบัญชีใหม่ต้องมีลายเซ็นจาก CHAIRMAN 1 เสียง
// และ FINANCE_MEMBER อย่างน้อย 1 เสียง คนละคนกัน จึงจะถือว่าเปิดบัญชีสมบูรณ์และบันทึกฝาก-ถอนได้
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const { id } = await params;
  const accountId = Number(id);

  const account = await prisma.bankAccount.findUnique({ where: { id: accountId } });
  if (!account) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบบัญชีที่ระบุ"] } }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (scope !== "all" && !scope.includes(account.villageId)) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบบัญชีที่ระบุ"] } }, { status: 404 });
  }

  const body = await request.json();
  const parsed = signSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.as === "chairman") {
    if (!canSignBankAccountAsChairman(user)) {
      return NextResponse.json(
        { error: { formErrors: ["เฉพาะประธานคณะกรรมการหมู่บ้านขึ้นไปเท่านั้นที่ลงนามในฐานะนี้ได้"] } },
        { status: 403 }
      );
    }
    if (account.chairmanApprovedById !== null) {
      return NextResponse.json({ error: { formErrors: ["มีการลงนามในฐานะประธานแล้ว"] } }, { status: 409 });
    }
    if (account.financeApprovedById === user.id) {
      return NextResponse.json(
        { error: { formErrors: ["ต้องลงนามคนละคนกับผู้ลงนามในฐานะฝ่ายการเงิน"] } },
        { status: 409 }
      );
    }
    const updated = await prisma.bankAccount.update({
      where: { id: accountId },
      data: { chairmanApprovedById: user.id, chairmanApprovedAt: new Date() },
    });
    return NextResponse.json({ ...updated, isFullyApproved: isBankAccountFullyApproved(updated) });
  }

  // as === "finance"
  if (!canSignBankAccountAsFinance(user)) {
    return NextResponse.json(
      { error: { formErrors: ["เฉพาะฝ่ายการเงินขึ้นไปเท่านั้นที่ลงนามในฐานะนี้ได้"] } },
      { status: 403 }
    );
  }
  if (account.financeApprovedById !== null) {
    return NextResponse.json({ error: { formErrors: ["มีการลงนามในฐานะฝ่ายการเงินแล้ว"] } }, { status: 409 });
  }
  if (account.chairmanApprovedById === user.id) {
    return NextResponse.json(
      { error: { formErrors: ["ต้องลงนามคนละคนกับผู้ลงนามในฐานะประธาน"] } },
      { status: 409 }
    );
  }
  const updated = await prisma.bankAccount.update({
    where: { id: accountId },
    data: { financeApprovedById: user.id, financeApprovedAt: new Date() },
  });
  return NextResponse.json({ ...updated, isFullyApproved: isBankAccountFullyApproved(updated) });
}
