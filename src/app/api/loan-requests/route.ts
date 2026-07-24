import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loanRequestSchema } from "@/lib/schemas";
import { LOAN_CEILING_DEFAULT } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, canAccessHouseholdRecord } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE } from "@/lib/authz";
import { notifyVillageLeadership } from "@/lib/notifications/notifyUsers";
import { createLoanRequestWithAutoNumber } from "@/lib/documentNumbering";
import { computeRepaymentDueDate } from "@/lib/loanSchedule";
import { Prisma } from "@/generated/prisma/client";

// แบบฟอร์ม 2 (แบบขอยืมเงินทุน): เฉพาะครัวเรือน (HOUSEHOLD) เป็นผู้สร้างของตนเองเท่านั้น — เจ้าหน้าที่/กรรมการ
// ห้ามยื่นแทนครัวเรือน (ป้องกันการปลอมแปลงข้อมูลการยื่นคำร้อง)
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (user.role !== "HOUSEHOLD") {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = loanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // ตรวจสอบซ้ำฝั่งเซิร์ฟเวอร์ (defense in depth) — เพดานนี้เป็นค่าเริ่มต้น ปรับได้ตามมติคณะกรรมการ
  if (data.requestedAmount > LOAN_CEILING_DEFAULT) {
    return NextResponse.json(
      { error: { formErrors: [`วงเงินขอยืมต้องไม่เกินเพดาน ${LOAN_CEILING_DEFAULT.toLocaleString("th-TH")} บาทต่อครั้ง`] } },
      { status: 400 }
    );
  }

  const household = await prisma.targetHousehold.findUnique({ where: { id: data.householdId } });
  if (!household) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบครัวเรือนเป้าหมายที่เลือก"] } }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (!canAccessHouseholdRecord(user, scope, household)) {
    return NextResponse.json({ error: { formErrors: ["คุณไม่มีสิทธิ์ยื่นขอยืมเงินให้ครัวเรือนนี้"] } }, { status: 403 });
  }

  // ถ้าอ้างอิงแบบเสนอโครงการที่อนุมัติแล้ว (ยื่นผ่านลิงก์ในการแจ้งเตือน) ให้คัดลอกเล่มที่/โครงการที่มาใช้แทน
  // การออกเลขชุดใหม่ และวงเงินขอยืมต้องไม่เกินวงเงินที่ประธานกรรมการอนุมัติไว้ในแบบเสนอโครงการนั้น
  let linkedProposal: { id: number; volumeNo: number | null; proposalNo: number | null; committeeAmount: number | null } | null = null;
  if (data.proposalId !== undefined) {
    const proposal = await prisma.projectProposal.findUnique({
      where: { id: data.proposalId },
      include: { loanRequests: { select: { id: true } } },
    });
    if (!proposal || proposal.householdId !== data.householdId) {
      return NextResponse.json({ error: { formErrors: ["ไม่พบแบบเสนอโครงการที่อ้างอิง"] } }, { status: 404 });
    }
    if (proposal.committeeDecision !== "approved") {
      return NextResponse.json(
        { error: { formErrors: ["แบบเสนอโครงการที่อ้างอิงยังไม่ได้รับการอนุมัติ"] } },
        { status: 409 }
      );
    }
    if (proposal.loanRequests.length > 0) {
      return NextResponse.json(
        { error: { formErrors: ["แบบเสนอโครงการนี้ถูกใช้ยื่นแบบขอยืมเงินทุนไปแล้ว"] } },
        { status: 409 }
      );
    }
    if (proposal.committeeAmount != null && data.requestedAmount > proposal.committeeAmount) {
      return NextResponse.json(
        {
          error: {
            fieldErrors: {
              requestedAmount: [
                `วงเงินขอยืมต้องไม่เกินวงเงินที่ประธานกรรมการอนุมัติ (${proposal.committeeAmount.toLocaleString("th-TH")} บาท)`,
              ],
            },
          },
        },
        { status: 400 }
      );
    }
    linkedProposal = proposal;
  }

  // หมายเหตุ: ตั้งใจไม่รับ workerOpinion/committeeDecision ฯลฯ จาก payload นี้ — ผู้ยื่นขอยืมเงิน
  // (ครัวเรือน) ต้องไม่สามารถตั้งค่าความเห็นพัฒนากร/ผลอนุมัติของตนเองได้ ต้องผ่าน endpoint
  // /worker-opinion และ /approve ที่ตรวจสิทธิ์แยกต่างหากเท่านั้น
  const requestDate = new Date(data.requestDate);
  const commonData = {
    householdId: data.householdId,
    applicantAge: data.applicantAge,
    occupation: data.occupation,
    requestedAmount: data.requestedAmount,
    agreesToRegulations: data.agreesToRegulations,
    spouseConsentName: data.spouseConsentName,
    requestDate,
    paymentDayOfMonth: data.paymentDayOfMonth,
    // คำนวณ ณ วันที่ยื่นคำขอ แล้วเก็บค่าไว้ตรงๆ (ดูเหตุผลที่ schema.prisma คอมเมนต์ไว้ที่ฟิลด์นี้)
    repaymentDueDate: computeRepaymentDueDate(requestDate),
  };
  let loanRequest;
  if (linkedProposal) {
    try {
      loanRequest = await prisma.loanRequest.create({
        data: {
          ...commonData,
          volumeNo: linkedProposal.volumeNo,
          requestNo: linkedProposal.proposalNo,
          proposalId: linkedProposal.id,
        },
      });
    } catch (error) {
      // กรณีหายาก: เลขที่ของแบบเสนอโครงการชนกับเลขที่ที่มีอยู่แล้วในแบบขอยืมเงินทุน (ข้อมูลเก่าก่อนระบบออกเลข
      // อัตโนมัติแบบพูลรวม) — แจ้งผู้ใช้ให้ติดต่อผู้ดูแลระบบแทนการปล่อยให้ 500
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json(
          { error: { formErrors: ["ไม่สามารถออกเลขที่อ้างอิงจากแบบเสนอโครงการนี้ได้ กรุณาติดต่อผู้ดูแลระบบ"] } },
          { status: 409 }
        );
      }
      throw error;
    }
  } else {
    loanRequest = await createLoanRequestWithAutoNumber(({ volumeNo, requestNo }) =>
      prisma.loanRequest.create({ data: { ...commonData, volumeNo, requestNo } })
    );
  }

  // แจ้งเตือนพัฒนากรผู้รับผิดชอบตำบลและประธานกรรมการหมู่บ้าน ให้เห็นคำร้องใหม่ที่รอพิจารณาทันที
  await notifyVillageLeadership(
    household.villageId,
    `แจ้งเตือน: ครัวเรือน ${household.headFirstName} ${household.headLastName} ยื่นแบบขอยืมเงินทุน (ฟอร์ม 2) ใหม่ วงเงิน ${data.requestedAmount.toLocaleString("th-TH")} บาท โปรดพิจารณา`,
    "/loan-requests"
  );

  return NextResponse.json(loanRequest, { status: 201 });
}
