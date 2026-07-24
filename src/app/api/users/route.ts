import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createUserSchema } from "@/lib/schemas";
import { computeDisplayName as resolveDisplayName, getCurrentUser, hashPassword } from "@/lib/auth";
import {
  canCreateItSupportAccount,
  creatableRoleFor,
  getCreatableAreaOptions,
  getManagedUserWhere,
  isAreaWithinJurisdiction,
  isUserManager,
} from "@/lib/userManagement";
import type { GlobalRole } from "@/generated/prisma/client";

// รายชื่อผู้ใช้งานที่อยู่ในความดูแล (ขอบเขตการ "มองเห็น" — กว้างกว่าขอบเขตการจัดการ)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!isUserManager(user)) {
    return NextResponse.json({ error: { formErrors: ["คุณไม่มีสิทธิ์เข้าถึงหน้าจัดการผู้ใช้งาน"] } }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: getManagedUserWhere(user),
    orderBy: [{ role: "asc" }, { username: "asc" }],
    select: {
      id: true,
      username: true,
      role: true,
      committeeRole: true,
      phoneNumber: true,
      email: true,
      lineId: true,
      isActive: true,
      householdProfile: { select: { age: true, occupation: true, consentPersonName: true, consentRelation: true } },
      committeeProfile: { select: { titlePrefix: true, titlePrefixOther: true, firstName: true, lastName: true } },
      officialProfile: { select: { titlePrefix: true, titlePrefixOther: true, firstName: true, lastName: true } },
      household: { select: { headFirstName: true, headLastName: true } },
      scopeVillage: { select: { villageName: true, villageNo: true } },
      scopeSubDistrict: { select: { name: true } },
      scopeDistrict: { select: { name: true } },
      scopeProvince: { select: { name: true } },
    },
  });

  return NextResponse.json(
    users.map(({ householdProfile, committeeProfile, officialProfile, household, ...u }) => ({
      ...u,
      householdProfile,
      displayName: resolveDisplayName({ ...u, committeeProfile, officialProfile, household }),
    }))
  );
}

// สร้างบัญชีผู้ใช้ใหม่ — เฉพาะ role ที่ต่ำกว่าตนเอง "1 ระดับ" ตามสายบังคับบัญชา (Top-Down Provisioning)
// ยกเว้นบัญชี IT_SUPPORT (ผู้ดูแลระบบด้านเทคนิค) ซึ่งไม่ได้อยู่ในสายบังคับบัญชานี้ — เฉพาะ GLOBAL_ADMIN
// สร้างได้เท่านั้น ผ่าน requestedRole: "IT_SUPPORT" (ดู canCreateItSupportAccount ใน lib/userManagement.ts)
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const body = await request.json();
  const isItSupportRequest = body?.requestedRole === "IT_SUPPORT";

  if (isItSupportRequest) {
    if (!canCreateItSupportAccount(user)) {
      return NextResponse.json({ error: { formErrors: ["คุณไม่มีสิทธิ์สร้างบัญชีผู้ดูแลระบบ (IT_SUPPORT)"] } }, { status: 403 });
    }
  } else if (!creatableRoleFor(user)) {
    return NextResponse.json({ error: { formErrors: ["คุณไม่มีสิทธิ์สร้างบัญชีผู้ใช้งาน"] } }, { status: 403 });
  }
  const targetRole: GlobalRole = isItSupportRequest ? "IT_SUPPORT" : creatableRoleFor(user)!;

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { username: data.username } });
  if (existing) {
    return NextResponse.json({ error: { fieldErrors: { username: ["ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว"] } } }, { status: 409 });
  }

  const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingEmail) {
    return NextResponse.json({ error: { fieldErrors: { email: ["อีเมลนี้มีผู้ใช้งานในระบบแล้ว"] } } }, { status: 409 });
  }

  // บัญชี IT_SUPPORT ไม่มีพื้นที่ (area) ผูกด้วย — เป็นบัญชีสำหรับดูแลระบบส่วนกลางเท่านั้น
  const { areaField, options } = isItSupportRequest ? { areaField: null, options: [] } : await getCreatableAreaOptions(user);

  const scopeFields: Record<string, number | undefined> = {};

  if (areaField) {
    // ทุก role ยกเว้น VILLAGE_COMMITTEE (สร้าง HOUSEHOLD) ต้องเลือกพื้นที่ย่อย และต้องอยู่ในเขตอำนาจของผู้สร้างเท่านั้น
    if (!data.areaId) {
      return NextResponse.json({ error: { fieldErrors: { areaId: ["กรุณาเลือกพื้นที่ที่รับผิดชอบ"] } } }, { status: 400 });
    }
    if (!options.some((o) => o.id === data.areaId)) {
      return NextResponse.json({ error: { fieldErrors: { areaId: ["พื้นที่ที่เลือกไม่อยู่ในเขตอำนาจของคุณ"] } } }, { status: 403 });
    }
    scopeFields[areaField] = data.areaId;
  } else if (user.role === "VILLAGE_COMMITTEE") {
    // กรรมการหมู่บ้านสร้างครัวเรือนในหมู่บ้านของตนเองโดยตรง — สืบทอด villageId จากผู้สร้างอัตโนมัติ
    scopeFields.scopeVillageId = user.scopeVillageId ?? undefined;
  }

  if (targetRole === "VILLAGE_COMMITTEE" && !data.committeeRole) {
    return NextResponse.json(
      { error: { fieldErrors: { committeeRole: ["กรุณาเลือกตำแหน่งในคณะกรรมการหมู่บ้าน"] } } },
      { status: 400 }
    );
  }

  if (targetRole === "HOUSEHOLD" && data.householdId) {
    const household = await prisma.targetHousehold.findUnique({ where: { id: data.householdId } });
    if (!household || household.villageId !== scopeFields.scopeVillageId) {
      return NextResponse.json(
        { error: { fieldErrors: { householdId: ["ไม่พบครัวเรือนเป้าหมายนี้ในหมู่บ้านของคุณ"] } } },
        { status: 400 }
      );
    }
  }

  const passwordHash = await hashPassword(data.password);
  const created = await prisma.user.create({
    data: {
      username: data.username,
      passwordHash,
      phoneNumber: data.phoneNumber,
      email: data.email,
      role: targetRole,
      committeeRole: targetRole === "VILLAGE_COMMITTEE" ? data.committeeRole : null,
      householdId: targetRole === "HOUSEHOLD" ? data.householdId : undefined,
      ...scopeFields,
      // ข้อมูลโปรไฟล์แยกตาม role ปลายทาง — ดูสถาปัตยกรรมที่ prisma/schema.prisma (Profile Separation)
      // HOUSEHOLD: ไม่บันทึกชื่อซ้ำที่นี่ เพราะชื่อหัวหน้าครัวเรือนอยู่ที่ TargetHousehold อยู่แล้ว
      householdProfile:
        targetRole === "HOUSEHOLD"
          ? {
              create: {
                age: data.age,
                occupation: data.occupation,
                consentPersonName: data.consentPersonName,
                consentRelation: data.consentRelation,
              },
            }
          : undefined,
      committeeProfile:
        targetRole === "VILLAGE_COMMITTEE"
          ? {
              create: {
                titlePrefix: data.titlePrefix,
                titlePrefixOther: data.titlePrefix === "OTHER" ? data.titlePrefixOther : undefined,
                firstName: data.firstName,
                lastName: data.lastName,
                termStartDate: data.termStartDate ? new Date(data.termStartDate) : undefined,
                termEndDate: data.termEndDate ? new Date(data.termEndDate) : undefined,
              },
            }
          : undefined,
      officialProfile:
        targetRole !== "HOUSEHOLD" && targetRole !== "VILLAGE_COMMITTEE"
          ? {
              create: {
                titlePrefix: data.titlePrefix,
                titlePrefixOther: data.titlePrefix === "OTHER" ? data.titlePrefixOther : undefined,
                firstName: data.firstName,
                lastName: data.lastName,
                positionTitle: data.positionTitle,
                handoverDate: data.handoverDate ? new Date(data.handoverDate) : undefined,
              },
            }
          : undefined,
    },
    include: { householdProfile: true, committeeProfile: true, officialProfile: true, household: true },
  });

  return NextResponse.json(
    { id: created.id, username: created.username, displayName: resolveDisplayName(created), role: created.role },
    { status: 201 }
  );
}
