import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { visitLogSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, scopeWhereDirect } from "@/lib/scope";
import { canCreateVisitLog, canViewVillageStatusBook, VISIT_LOG_DENIED_MESSAGE } from "@/lib/authz";

// ดูรายการบันทึกการติดตาม/ให้ข้อแนะนำ — เฉพาะพัฒนากรตำบล/ผู้บริหารอำเภอ/ผู้บริหารจังหวัด ตามเขตพื้นที่ของตน
// (ใช้สิทธิ์ชุดเดียวกับสมุดบันทึกสถานะหมู่บ้าน เล่มน้ำตาล — ดู lib/authz.ts: canViewVillageStatusBook)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canViewVillageStatusBook(user)) {
    return NextResponse.json({ error: { formErrors: [VISIT_LOG_DENIED_MESSAGE] } }, { status: 403 });
  }

  const scope = await getAllowedVillageIds(user);
  const records = await prisma.visitLog.findMany({
    where: scopeWhereDirect(scope),
    orderBy: { visitDate: "desc" },
    include: {
      village: { select: { villageName: true, villageNo: true } },
      attachments: { select: { id: true, fileUrl: true } },
    },
  });

  return NextResponse.json(
    records.map((r) => ({
      id: r.id,
      villageId: r.villageId,
      villageName: r.village.villageName,
      villageNo: r.village.villageNo,
      visitDate: r.visitDate.toISOString(),
      visitType: r.visitType,
      visitorName: r.visitorName,
      visitorTitle: r.visitorTitle,
      notes: r.notes,
      recordedById: r.recordedById,
      attachments: r.attachments,
    }))
  );
}

// บันทึกการติดตาม/ให้ข้อแนะนำใหม่ — เฉพาะพัฒนากรตำบล (SUB_DISTRICT_ADMIN) เท่านั้น บันทึกในนามตนเองเสมอ
// (ดึงชื่อ-ตำแหน่งจาก OfficialProfile ของผู้บันทึกอัตโนมัติ ไม่รับจาก client) villageId ต้องอยู่ในเขตตำบลตนเอง
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canCreateVisitLog(user)) {
    return NextResponse.json({ error: { formErrors: [VISIT_LOG_DENIED_MESSAGE] } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = visitLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const scope = await getAllowedVillageIds(user);
  if (scope !== "all" && !scope.includes(data.villageId)) {
    return NextResponse.json({ error: { formErrors: ["หมู่บ้านที่เลือกไม่อยู่ในเขตตำบลของคุณ"] } }, { status: 403 });
  }

  const officialProfile = await prisma.officialProfile.findUnique({ where: { userId: user.id } });

  const created = await prisma.visitLog.create({
    data: {
      villageId: data.villageId,
      visitDate: new Date(data.visitDate),
      visitType: data.visitType,
      visitorName: officialProfile ? `${officialProfile.firstName} ${officialProfile.lastName}` : user.displayName,
      visitorTitle: officialProfile?.positionTitle ?? null,
      notes: data.notes,
      recordedById: user.id,
      attachments: data.attachmentUrls?.length
        ? { create: data.attachmentUrls.map((fileUrl) => ({ fileUrl })) }
        : undefined,
    },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
