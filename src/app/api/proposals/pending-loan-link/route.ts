import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// ครัวเรือนที่มีแบบเสนอโครงการอนุมัติแล้วแต่ยังไม่ได้ใช้ยื่นแบบขอยืมเงินทุน — ใช้เป็น fallback ตอนเปิดหน้า
// /loan-requests/new โดยไม่ได้มาจากลิงก์ในการแจ้งเตือนโดยตรง (เช่น พลาดกดแจ้งเตือน หรือกดทำเครื่องหมายอ่านแล้ว
// ไปก่อน) เพื่อให้ยังคงบังคับใช้เพดานวงเงินตามที่ประธานอนุมัติ+เติมเล่มที่/โครงการที่ให้อัตโนมัติเสมอ ไม่ใช่แค่
// ตอนมาจากลิงก์แจ้งเตือนเท่านั้น — คืนค่า null (ไม่ error) เมื่อไม่มีแบบเสนอโครงการที่ค้างอยู่ ให้ฟอร์มทำงานแบบ
// ยื่นอิสระตามปกติต่อไปได้
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });
  if (user.role !== "HOUSEHOLD" || !user.householdId) {
    return NextResponse.json(null);
  }

  const proposal = await prisma.projectProposal.findFirst({
    where: { householdId: user.householdId, committeeDecision: "approved", loanRequests: { none: {} } },
    orderBy: { committeeDate: "desc" },
    include: {
      household: {
        include: {
          users: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { householdProfile: { select: { consentPersonName: true } } },
          },
        },
      },
    },
  });
  if (!proposal) return NextResponse.json(null);

  return NextResponse.json({
    id: proposal.id,
    householdId: proposal.householdId,
    volumeNo: proposal.volumeNo,
    proposalNo: proposal.proposalNo,
    committeeAmount: proposal.committeeAmount,
    applicantAge: proposal.applicantAge,
    occupation: proposal.occupation,
    consentPersonName: proposal.household.users[0]?.householdProfile?.consentPersonName ?? null,
  });
}
