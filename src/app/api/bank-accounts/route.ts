import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bankAccountRequestSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canRequestBankAccount } from "@/lib/authz";
import { notifyUsers } from "@/lib/notifications/notifyUsers";

// บัญชีคุมเงินฝาก (เล่มเขียว): ยื่นคำขอเปิดบัญชีธนาคารใหม่ให้หมู่บ้าน — เลขานุการหรือฝ่ายการเงินเป็นผู้ยื่น
// บัญชีที่สร้างยังบันทึกรายการฝาก-ถอนไม่ได้จนกว่าจะผ่านการลงนามอนุมัติครบ 2 ฝ่าย (ดู /api/bank-accounts/[id]/approve)
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canRequestBankAccount(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = bankAccountRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const scope = await getAllowedVillageIds(user);
  if (scope !== "all" && !scope.includes(data.villageId)) {
    return NextResponse.json({ error: { formErrors: ["คุณไม่มีสิทธิ์ยื่นคำขอเปิดบัญชีให้หมู่บ้านนี้"] } }, { status: 403 });
  }

  const existing = await prisma.bankAccount.findFirst({ where: { villageId: data.villageId } });
  if (existing) {
    return NextResponse.json({ error: { formErrors: ["หมู่บ้านนี้มีบัญชีธนาคารอยู่แล้ว"] } }, { status: 409 });
  }

  const account = await prisma.bankAccount.create({
    data: {
      villageId: data.villageId,
      bankName: data.bankName,
      branch: data.branch,
      accountNo: data.accountNo,
      accountName: data.accountName,
      requestedById: user.id,
    },
  });

  // แจ้งเตือนประธานและฝ่ายการเงินของหมู่บ้านนี้ — ทั้งสองฝ่ายต้องลงนามอนุมัติก่อนบัญชีจะใช้งานได้
  const signers = await prisma.user.findMany({
    where: { role: "VILLAGE_COMMITTEE", committeeRole: { in: ["CHAIRMAN", "FINANCE_MEMBER"] }, scopeVillageId: data.villageId },
    select: { id: true },
  });
  await notifyUsers(
    signers.map((s) => s.id),
    `แจ้งเตือน: มีคำขอเปิดบัญชีธนาคารใหม่ "${data.bankName}" รอลงนามอนุมัติจากท่าน (ต้องลงนามครบทั้งประธานและฝ่ายการเงิน)`,
    "ALERT",
    "/bank-accounts"
  );

  return NextResponse.json(account, { status: 201 });
}
