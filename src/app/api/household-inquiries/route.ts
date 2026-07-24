import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { householdInquirySchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, scopeWhereDirect } from "@/lib/scope";
import {
  canSubmitHouseholdInquiry,
  canViewHouseholdInquiries,
  HOUSEHOLD_INQUIRY_DENIED_MESSAGE,
} from "@/lib/authz";
import { notifyDistrictAndProvinceAdmins } from "@/lib/notifications/notifyUsers";

const TOPIC_LABEL: Record<string, string> = { CONSULT: "ปรึกษา", COMPLAINT: "ร้องทุกข์", OTHER: "อื่นๆ" };

// ดูรายการคำร้อง "ปรึกษา/ร้องทุกข์" — ครัวเรือนเห็นเฉพาะของตนเอง, ผู้บริหารอำเภอ/จังหวัดเห็นตามเขตพื้นที่ของตน
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  let where: Prisma.HouseholdInquiryWhereInput;
  if (user.role === "HOUSEHOLD") {
    where = { householdId: user.householdId ?? -1 };
  } else if (canViewHouseholdInquiries(user)) {
    const scope = await getAllowedVillageIds(user);
    where = scopeWhereDirect(scope);
  } else {
    return NextResponse.json({ error: { formErrors: [HOUSEHOLD_INQUIRY_DENIED_MESSAGE] } }, { status: 403 });
  }

  const records = await prisma.householdInquiry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      household: { select: { sequenceNo: true, headFirstName: true, headLastName: true } },
      village: {
        select: {
          villageName: true,
          villageNo: true,
          subDistrict: { select: { name: true, district: { select: { name: true, province: { select: { name: true } } } } } },
        },
      },
      submittedBy: { select: { username: true } },
    },
  });

  return NextResponse.json(
    records.map((r) => ({
      id: r.id,
      topic: r.topic,
      topicLabel: r.topic === "OTHER" ? r.topicOther || "อื่นๆ" : TOPIC_LABEL[r.topic],
      details: r.details,
      attachmentUrl: r.attachmentUrl,
      createdAt: r.createdAt.toISOString(),
      householdName: `${r.household.headFirstName} ${r.household.headLastName}`,
      householdSequenceNo: r.household.sequenceNo,
      villageName: r.village.villageName,
      villageNo: r.village.villageNo,
      subDistrictName: r.village.subDistrict.name,
      districtName: r.village.subDistrict.district.name,
      provinceName: r.village.subDistrict.district.province.name,
      submittedByUsername: r.submittedBy.username,
    }))
  );
}

// ครัวเรือนส่งคำร้องใหม่ — แจ้งเตือนผู้บริหารอำเภอ/จังหวัดในเขตพื้นที่ของหมู่บ้านตนเองทันที
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canSubmitHouseholdInquiry(user)) {
    return NextResponse.json({ error: { formErrors: [HOUSEHOLD_INQUIRY_DENIED_MESSAGE] } }, { status: 403 });
  }
  if (!user.householdId) {
    return NextResponse.json({ error: { formErrors: ["บัญชีของคุณยังไม่ได้ผูกกับครัวเรือนเป้าหมายใดในระบบ"] } }, { status: 400 });
  }

  const body = await request.json();
  const parsed = householdInquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const household = await prisma.targetHousehold.findUnique({
    where: { id: user.householdId },
    select: { villageId: true, headFirstName: true, headLastName: true },
  });
  if (!household) return NextResponse.json({ error: { formErrors: ["ไม่พบข้อมูลครัวเรือน"] } }, { status: 404 });

  const created = await prisma.householdInquiry.create({
    data: {
      householdId: user.householdId,
      villageId: household.villageId,
      topic: data.topic,
      topicOther: data.topic === "OTHER" ? data.topicOther : undefined,
      details: data.details,
      attachmentUrl: data.attachmentUrl || undefined,
      submittedById: user.id,
    },
  });

  const topicLabel = data.topic === "OTHER" ? data.topicOther || "อื่นๆ" : TOPIC_LABEL[data.topic];
  await notifyDistrictAndProvinceAdmins(
    household.villageId,
    `ครัวเรือน ${household.headFirstName} ${household.headLastName} ส่งคำร้อง "${topicLabel}" ใหม่`,
    "/settings/household-inquiries"
  );

  return NextResponse.json({ id: created.id }, { status: 201 });
}
