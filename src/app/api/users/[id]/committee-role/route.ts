import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeDisplayName, getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { canManageCommitteeRoles } from "@/lib/authz";

const updateCommitteeRoleSchema = z.object({
  committeeRole: z.enum(["CHAIRMAN", "SECRETARY", "FINANCE_MEMBER", "NORMAL_MEMBER"]).nullable(),
});

// จัดการสิทธิ์หมู่บ้าน: ตั้ง/เปลี่ยนตำแหน่งย่อยของสมาชิกคณะกรรมการ (committeeRole)
// เฉพาะ SUB_DISTRICT_ADMIN ขึ้นไปเท่านั้น — ป้องกันหมู่บ้านตั้งสิทธิ์กันเอง
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canManageCommitteeRoles(user)) {
    return NextResponse.json(
      { error: { formErrors: ["เฉพาะพัฒนากรขึ้นไปเท่านั้นที่ตั้งตำแหน่งคณะกรรมการหมู่บ้านได้"] } },
      { status: 403 }
    );
  }

  const { id } = await params;
  const targetUserId = Number(id);

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบผู้ใช้งานที่ระบุ"] } }, { status: 404 });
  }
  if (targetUser.role !== "VILLAGE_COMMITTEE") {
    return NextResponse.json(
      { error: { formErrors: ["ตั้งตำแหน่งคณะกรรมการได้เฉพาะผู้ใช้งานที่มี role เป็น VILLAGE_COMMITTEE เท่านั้น"] } },
      { status: 400 }
    );
  }

  // จำกัดขอบเขต: ผู้บริหารระดับตำบล/อำเภอ/จังหวัด จัดการได้เฉพาะคณะกรรมการในหมู่บ้านที่ตนดูแลอยู่ (GLOBAL_ADMIN ไม่จำกัด)
  const scope = await getAllowedVillageIds(user);
  if (scope !== "all" && (!targetUser.scopeVillageId || !scope.includes(targetUser.scopeVillageId))) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบผู้ใช้งานที่ระบุ"] } }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateCommitteeRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { committeeRole: parsed.data.committeeRole },
    select: {
      id: true,
      username: true,
      role: true,
      committeeRole: true,
      committeeProfile: { select: { firstName: true, lastName: true } },
      officialProfile: { select: { firstName: true, lastName: true } },
      household: { select: { headFirstName: true, headLastName: true } },
    },
  });
  const { committeeProfile, officialProfile, household, ...rest } = updated;
  return NextResponse.json({ ...rest, displayName: computeDisplayName({ ...rest, committeeProfile, officialProfile, household }) });
}
