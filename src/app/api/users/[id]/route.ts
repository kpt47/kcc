import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { editUserSchema } from "@/lib/schemas";
import { computeDisplayName as resolveDisplayName, getCurrentUser } from "@/lib/auth";
import { canManageTargetRole, getManagedUserWhere } from "@/lib/userManagement";

/**
 * ตรวจสอบสิทธิ์ก่อนแก้ไข/ลบบัญชีผู้ใช้งาน — ใช้ร่วมกันทั้ง PATCH และ DELETE ด้านล่าง
 * (ต้องไม่ใช่บัญชีตนเอง, ต้องมีอยู่จริง, ต้องอยู่ในเขตอำนาจและเป็น role ที่จัดการได้ตามลำดับชั้น Top-Down)
 */
async function loadManageableTarget(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>, targetId: number) {
  if (targetId === user.id) {
    return {
      error: NextResponse.json(
        { error: { formErrors: ["ไม่สามารถแก้ไข/ระงับบัญชีของตนเองผ่านหน้านี้ได้ กรุณาใช้หน้าโปรไฟล์"] } },
        { status: 403 }
      ),
    };
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) {
    return { error: NextResponse.json({ error: { formErrors: ["ไม่พบผู้ใช้งานที่ระบุ"] } }, { status: 404 }) };
  }

  const inScope = await prisma.user.findFirst({ where: { id: targetId, ...getManagedUserWhere(user) } });
  if (!inScope || !canManageTargetRole(user, target.role)) {
    return { error: NextResponse.json({ error: { formErrors: ["คุณไม่มีสิทธิ์จัดการบัญชีผู้ใช้งานนี้"] } }, { status: 403 }) };
  }

  return { target };
}

/**
 * ระงับการใช้งานบัญชี (Soft Delete) — ตั้ง isActive = false เท่านั้น ห้ามลบระเบียนออกจากฐานข้อมูลจริงเด็ดขาด
 * เพราะบัญชี HOUSEHOLD ยังผูกอยู่กับ TargetHousehold/Loan (บัญชีคุมลูกหนี้ เล่มเหลือง) การลบจริงจะทำให้ประวัติเสียหาย
 * ประธานคณะกรรมการหมู่บ้าน (CHAIRMAN) ใช้สิทธิ์นี้กับบัญชี HOUSEHOLD ในหมู่บ้านตนเองได้ (ผ่าน canManageTargetRole เดิม)
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const { id } = await params;
  const { target, error } = await loadManageableTarget(user, Number(id));
  if (error) return error;

  const updated = await prisma.user.update({ where: { id: target!.id }, data: { isActive: false } });
  return NextResponse.json({ id: updated.id, isActive: updated.isActive, deactivated: true });
}

// แก้ไขข้อมูล / เปิดใช้งานอีกครั้ง (isActive: true) — เฉพาะ role ที่ต่ำกว่าตนเอง 1 ระดับ และอยู่ในเขตอำนาจของตนเองเท่านั้น
// ไม่รองรับการเปลี่ยน role หรือพื้นที่ผ่าน endpoint นี้ (คงหลักการ Top-Down Provisioning ที่กำหนดตอนสร้างเท่านั้น)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const { id } = await params;
  const targetId = Number(id);
  const { target: targetOrUndefined, error } = await loadManageableTarget(user, targetId);
  if (error) return error;
  const target = targetOrUndefined!;

  const body = await request.json();
  const parsed = editUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  if (data.committeeRole !== undefined && target.role !== "VILLAGE_COMMITTEE") {
    return NextResponse.json(
      { error: { fieldErrors: { committeeRole: ["กำหนดตำแหน่งคณะกรรมการได้เฉพาะบัญชีกรรมการหมู่บ้านเท่านั้น"] } } },
      { status: 400 }
    );
  }

  if (data.email !== undefined) {
    const existingEmail = await prisma.user.findFirst({ where: { email: data.email, id: { not: targetId } } });
    if (existingEmail) {
      return NextResponse.json({ error: { fieldErrors: { email: ["อีเมลนี้มีผู้ใช้งานในระบบแล้ว"] } } }, { status: 409 });
    }
  }

  // อัปเดตข้อมูลโปรไฟล์แบบ upsert ตาม role ปลายทาง (HOUSEHOLD ไม่มีชื่อบน profile — ดู POST /api/users)
  const householdProfileUpdate =
    target.role === "HOUSEHOLD" &&
    (data.age !== undefined || data.occupation !== undefined || data.consentPersonName !== undefined || data.consentRelation !== undefined)
      ? {
          upsert: {
            update: { age: data.age, occupation: data.occupation, consentPersonName: data.consentPersonName, consentRelation: data.consentRelation },
            create: { age: data.age, occupation: data.occupation, consentPersonName: data.consentPersonName, consentRelation: data.consentRelation },
          },
        }
      : undefined;

  const committeeProfileUpdate =
    target.role === "VILLAGE_COMMITTEE" && (data.firstName !== undefined || data.lastName !== undefined || data.termStartDate !== undefined || data.termEndDate !== undefined)
      ? {
          upsert: {
            update: {
              firstName: data.firstName,
              lastName: data.lastName,
              termStartDate: data.termStartDate ? new Date(data.termStartDate) : undefined,
              termEndDate: data.termEndDate ? new Date(data.termEndDate) : undefined,
            },
            create: {
              firstName: data.firstName ?? "",
              lastName: data.lastName ?? "",
              termStartDate: data.termStartDate ? new Date(data.termStartDate) : undefined,
              termEndDate: data.termEndDate ? new Date(data.termEndDate) : undefined,
            },
          },
        }
      : undefined;

  const officialProfileUpdate =
    target.role !== "HOUSEHOLD" &&
    target.role !== "VILLAGE_COMMITTEE" &&
    (data.firstName !== undefined || data.lastName !== undefined || data.positionTitle !== undefined || data.handoverDate !== undefined)
      ? {
          upsert: {
            update: {
              firstName: data.firstName,
              lastName: data.lastName,
              positionTitle: data.positionTitle,
              handoverDate: data.handoverDate ? new Date(data.handoverDate) : undefined,
            },
            create: {
              firstName: data.firstName ?? "",
              lastName: data.lastName ?? "",
              positionTitle: data.positionTitle,
              handoverDate: data.handoverDate ? new Date(data.handoverDate) : undefined,
            },
          },
        }
      : undefined;

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: {
      committeeRole: data.committeeRole,
      phoneNumber: data.phoneNumber,
      email: data.email,
      lineId: data.lineId,
      isActive: data.isActive,
      householdProfile: householdProfileUpdate,
      committeeProfile: committeeProfileUpdate,
      officialProfile: officialProfileUpdate,
    },
    include: { householdProfile: true, committeeProfile: true, officialProfile: true, household: true },
  });

  return NextResponse.json({
    id: updated.id,
    username: updated.username,
    displayName: resolveDisplayName(updated),
    committeeRole: updated.committeeRole,
    isActive: updated.isActive,
  });
}
