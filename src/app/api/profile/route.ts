import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { selfProfileSchema } from "@/lib/schemas";
import { getCurrentUser, getHouseholdProfileView } from "@/lib/auth";

// หน้า "บัญชีของฉัน" (self-service) — ดู/แก้ไขเบอร์โทร/LINE ของตนเอง (+ ชื่อ-สกุล สำหรับ role
// ที่ไม่ใช่ HOUSEHOLD เนื่องจากชื่อครัวเรือนอ้างอิงจาก TargetHousehold ซึ่งแก้ผ่านหน้าทะเบียนครัวเรือนเท่านั้น)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const householdView = user.role === "HOUSEHOLD" ? await getHouseholdProfileView(user) : null;

  const committeeProfile =
    user.role === "VILLAGE_COMMITTEE" ? await prisma.committeeProfile.findUnique({ where: { userId: user.id } }) : null;
  const officialProfile =
    user.role !== "HOUSEHOLD" && user.role !== "VILLAGE_COMMITTEE"
      ? await prisma.officialProfile.findUnique({ where: { userId: user.id } })
      : null;

  return NextResponse.json({ householdView, committeeProfile, officialProfile });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const body = await request.json();
  const parsed = selfProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // ครัวเรือน แก้ชื่อ-สกุล/คำนำหน้าตนเองผ่านหน้านี้ไม่ได้ — HouseholdProfile ไม่มีฟิลด์เหล่านี้ (อยู่ที่ TargetHousehold)
  if (
    user.role === "HOUSEHOLD" &&
    (data.firstName !== undefined || data.lastName !== undefined || data.titlePrefix !== undefined || data.titlePrefixOther !== undefined)
  ) {
    return NextResponse.json(
      { error: { formErrors: ["ครัวเรือนไม่สามารถแก้ไขชื่อผ่านหน้านี้ได้ กรุณาติดต่อพัฒนากร"] } },
      { status: 403 }
    );
  }

  if (data.email !== undefined) {
    const existingEmail = await prisma.user.findFirst({ where: { email: data.email, id: { not: user.id } } });
    if (existingEmail) {
      return NextResponse.json({ error: { fieldErrors: { email: ["อีเมลนี้มีผู้ใช้งานในระบบแล้ว"] } } }, { status: 409 });
    }
  }

  const profileUpdate =
    data.firstName !== undefined || data.lastName !== undefined || data.titlePrefix !== undefined || data.titlePrefixOther !== undefined
      ? {
          upsert: {
            update: {
              firstName: data.firstName,
              lastName: data.lastName,
              titlePrefix: data.titlePrefix,
              titlePrefixOther: data.titlePrefix === "OTHER" ? data.titlePrefixOther : undefined,
            },
            create: {
              firstName: data.firstName ?? "",
              lastName: data.lastName ?? "",
              titlePrefix: data.titlePrefix,
              titlePrefixOther: data.titlePrefix === "OTHER" ? data.titlePrefixOther : undefined,
            },
          },
        }
      : undefined;

  const householdProfileUpdate =
    user.role === "HOUSEHOLD" && data.reminderLeadDays !== undefined
      ? {
          upsert: {
            update: { reminderLeadDays: data.reminderLeadDays },
            create: { reminderLeadDays: data.reminderLeadDays },
          },
        }
      : undefined;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      phoneNumber: data.phoneNumber,
      email: data.email,
      lineId: data.lineId,
      committeeProfile: user.role === "VILLAGE_COMMITTEE" ? profileUpdate : undefined,
      officialProfile: user.role !== "HOUSEHOLD" && user.role !== "VILLAGE_COMMITTEE" ? profileUpdate : undefined,
      householdProfile: householdProfileUpdate,
    },
  });

  return NextResponse.json({ ok: true });
}
