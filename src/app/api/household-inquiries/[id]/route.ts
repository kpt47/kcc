import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { householdInquiryReplySchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { canViewHouseholdInquiries, HOUSEHOLD_INQUIRY_DENIED_MESSAGE } from "@/lib/authz";
import { notifyUsers } from "@/lib/notifications/notifyUsers";

const STATUS_LABEL: Record<string, string> = { IN_PROGRESS: "กำลังแก้ไข", RESOLVED: "เรียบร้อยแล้ว", OTHER: "อื่นๆ" };

// พัฒนาการอำเภอ/พัฒนาการจังหวัดตอบกลับ+อัปเดตสถานะคำร้อง ภายในเขตพื้นที่ของตนเองเท่านั้น
// แจ้งเตือนครัวเรือนที่ยื่นคำร้องทันทีเมื่อมีการตอบกลับ/อัปเดตสถานะ
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canViewHouseholdInquiries(user)) {
    return NextResponse.json({ error: { formErrors: [HOUSEHOLD_INQUIRY_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id } = await params;
  const inquiry = await prisma.householdInquiry.findUnique({
    where: { id: Number(id) },
    select: {
      villageId: true,
      householdId: true,
      household: { select: { headFirstName: true, headLastName: true, users: { select: { id: true } } } },
    },
  });
  if (!inquiry) return NextResponse.json({ error: { formErrors: ["ไม่พบคำร้องที่ระบุ"] } }, { status: 404 });

  const scope = await getAllowedVillageIds(user);
  if (scope !== "all" && !scope.includes(inquiry.villageId)) {
    return NextResponse.json({ error: { formErrors: ["คำร้องนี้อยู่นอกเขตพื้นที่ของคุณ"] } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = householdInquiryReplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  await prisma.householdInquiry.update({
    where: { id: Number(id) },
    data: {
      status: data.status,
      statusOther: data.status === "OTHER" ? data.statusOther : null,
      reply: data.reply || null,
      repliedById: user.id,
      repliedAt: new Date(),
    },
  });

  const statusLabel = data.status === "OTHER" ? data.statusOther || "อื่นๆ" : STATUS_LABEL[data.status];
  const householdUserIds = inquiry.household.users.map((u) => u.id);
  await notifyUsers(
    householdUserIds,
    `คำร้องของคุณได้รับการตอบกลับแล้ว (สถานะ: ${statusLabel})`,
    "ALERT",
    "/household-inquiries"
  );

  return NextResponse.json({ ok: true });
}
