import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { householdPaymentReportSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { notifyUsers } from "@/lib/notifications/notifyUsers";

// ครัวเรือนแจ้งชำระเงินเอง — บังคับ role === HOUSEHOLD และผูกกับครัวเรือนของตนเองเท่านั้น (ห้ามระบุ loanId
// หรือ householdId เอง เพื่อป้องกันการแจ้งชำระให้ครัวเรือนอื่น — ระบบเลือกเงินยืมที่ยังไม่ปิดสัญญาให้เอง)
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (user.role !== "HOUSEHOLD") {
    return NextResponse.json(
      { error: { formErrors: ["เฉพาะบัญชีครัวเรือนเป้าหมายเท่านั้นที่แจ้งชำระเงินด้วยตนเองได้"] } },
      { status: 403 }
    );
  }
  if (!user.householdId) {
    return NextResponse.json(
      { error: { formErrors: ["บัญชีของคุณยังไม่ได้ผูกกับครัวเรือนเป้าหมายใดในระบบ กรุณาติดต่อพัฒนากรหรือคณะกรรมการหมู่บ้าน"] } },
      { status: 400 }
    );
  }

  const activeLoan = await prisma.loan.findFirst({
    where: { householdId: user.householdId, isClosed: false },
    orderBy: { receivedDate: "asc" },
    include: { household: { select: { headFirstName: true, headLastName: true, villageId: true } } },
  });
  if (!activeLoan) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบรายการเงินยืมที่ต้องชำระของครัวเรือนคุณ"] } }, { status: 404 });
  }

  const body = await request.json();
  const parsed = householdPaymentReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const repayment = await prisma.loanRepayment.create({
    data: {
      loanId: activeLoan.id,
      amount: data.amount,
      paymentDate: new Date(data.paymentDate),
      transferSlipUrl: data.transferSlipUrl,
      householdNote: data.householdNote,
      status: "PENDING",
    },
  });

  // แจ้งเตือนเฉพาะฝ่ายการเงินและเลขานุการของหมู่บ้านนี้เท่านั้น (ห้ามแจ้งข้ามหมู่บ้าน)
  const recipients = await prisma.user.findMany({
    where: {
      role: "VILLAGE_COMMITTEE",
      committeeRole: { in: ["FINANCE_MEMBER", "SECRETARY"] },
      scopeVillageId: activeLoan.household.villageId,
    },
    select: { id: true },
  });
  const householdName = `${activeLoan.household.headFirstName} ${activeLoan.household.headLastName}`;
  await notifyUsers(
    recipients.map((r) => r.id),
    `มีการแจ้งชำระค่างวดใหม่จาก ${householdName} ยอดเงิน ${data.amount.toLocaleString("th-TH")} บาท พร้อมแนบสลิป โปรดตรวจสอบ`,
    "ALERT",
    `/loans?review=${repayment.id}`
  );

  return NextResponse.json(repayment, { status: 201 });
}

// ประวัติการแจ้งชำระเงินของครัวเรือนตนเองเท่านั้น — ห้ามดึงของครัวเรือนอื่นเด็ดขาด
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (user.role !== "HOUSEHOLD") {
    return NextResponse.json(
      { error: { formErrors: ["เฉพาะบัญชีครัวเรือนเป้าหมายเท่านั้นที่เข้าถึงหน้านี้ได้"] } },
      { status: 403 }
    );
  }
  if (!user.householdId) {
    return NextResponse.json([]);
  }

  const payments = await prisma.loanRepayment.findMany({
    where: { loan: { householdId: user.householdId } },
    orderBy: [{ paymentDate: "desc" }, { id: "desc" }],
    include: { loan: { select: { contractNo: true, outstandingBalance: true, borrowRound: true } } },
  });

  return NextResponse.json(payments);
}
