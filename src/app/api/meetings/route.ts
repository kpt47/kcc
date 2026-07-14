import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, scopeWhereDirect } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canCreateMeetingRecord } from "@/lib/authz";
import { meetingRecordSchema } from "@/lib/schemas";

// ดูรายการวาระการประชุม/มติคณะกรรมการ กข.คจ. หมู่บ้าน — ทุก role ดูได้ (HOUSEHOLD ถึง GLOBAL_ADMIN)
// แต่บังคับ Area-Based Isolation เสมอผ่าน getAllowedVillageIds (ครัวเรือน/กรรมการเห็นเฉพาะหมู่บ้านตนเอง)
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const scope = await getAllowedVillageIds(user);

  const url = new URL(request.url);
  const requestedVillageId = url.searchParams.get("villageId") ? Number(url.searchParams.get("villageId")) : undefined;
  if (requestedVillageId !== undefined && scope !== "all" && !scope.includes(requestedVillageId)) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบหมู่บ้านที่ระบุ"] } }, { status: 404 });
  }

  const records = await prisma.villageMeetingRecord.findMany({
    where: {
      ...scopeWhereDirect(scope),
      ...(requestedVillageId !== undefined ? { villageId: requestedVillageId } : {}),
    },
    orderBy: { meetingDate: "desc" },
    include: {
      village: { select: { villageName: true, villageNo: true } },
      uploadedBy: { select: { committeeProfile: { select: { firstName: true, lastName: true } } } },
    },
  });

  return NextResponse.json(
    records.map((r) => ({
      id: r.id,
      villageId: r.villageId,
      villageName: r.village.villageName,
      villageNo: r.village.villageNo,
      meetingDate: r.meetingDate.toISOString(),
      agendaTopic: r.agendaTopic,
      fileUrl: r.fileUrl,
      uploadedByName: r.uploadedBy.committeeProfile
        ? `${r.uploadedBy.committeeProfile.firstName} ${r.uploadedBy.committeeProfile.lastName}`
        : "-",
    }))
  );
}

// สร้าง/อัปโหลดวาระการประชุมใหม่ — เฉพาะประธาน/เลขานุการ/ฝ่ายการเงินของหมู่บ้านตนเองเท่านั้น
// villageId ไม่รับจาก client — ใช้ scopeVillageId ของผู้สร้างเสมอ เพื่อไม่ให้แอบสร้างข้ามหมู่บ้าน
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canCreateMeetingRecord(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }
  if (!user.scopeVillageId) {
    return NextResponse.json({ error: { formErrors: ["บัญชีของคุณยังไม่ได้ผูกกับหมู่บ้านใด"] } }, { status: 400 });
  }

  const body = await request.json();
  const parsed = meetingRecordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const created = await prisma.villageMeetingRecord.create({
    data: {
      villageId: user.scopeVillageId,
      meetingDate: new Date(data.meetingDate),
      agendaTopic: data.agendaTopic,
      fileUrl: data.fileUrl,
      uploadedById: user.id,
    },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
