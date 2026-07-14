import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ROLE_LABELS } from "@/lib/auth";
import { creatableRoleFor, getCreatableAreaOptions, isUserManager } from "@/lib/userManagement";
import { VILLAGE_ADDRESS_INCLUDE, villageAddress } from "@/lib/geo";

// ตัวเลือก role และพื้นที่ย่อยสำหรับฟอร์ม "เพิ่มผู้ใช้งานใหม่" — คำนวณจากสายบังคับบัญชาของผู้ใช้ปัจจุบัน
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!isUserManager(user)) {
    return NextResponse.json({ error: { formErrors: ["คุณไม่มีสิทธิ์สร้างบัญชีผู้ใช้งาน"] } }, { status: 403 });
  }

  const targetRole = creatableRoleFor(user);
  const { areaField, options } = await getCreatableAreaOptions(user);

  // กรรมการหมู่บ้าน (ประธาน/เลขานุการ) สร้างครัวเรือนในหมู่บ้านของตนเองเสมอ ไม่มีช่องให้เลือกพื้นที่ (areaField === null)
  // แสดงชื่อหมู่บ้านที่จะสืบทอดให้ (Read-only) เพื่อให้ผู้กรอกฟอร์มเห็นบริบทก่อนกดสร้างบัญชี
  let inheritedAreaLabel: string | null = null;
  if (!areaField && user.role === "VILLAGE_COMMITTEE" && user.scopeVillageId) {
    const village = await prisma.village.findUnique({
      where: { id: user.scopeVillageId },
      include: VILLAGE_ADDRESS_INCLUDE,
    });
    if (village) {
      const addr = villageAddress(village);
      inheritedAreaLabel = `หมู่ ${village.villageNo} บ้าน${village.villageName} ต.${addr.subDistrictName} อ.${addr.districtName} จ.${addr.provinceName}`;
    }
  }

  return NextResponse.json({
    targetRole,
    targetRoleLabel: targetRole ? (ROLE_LABELS[targetRole] ?? targetRole) : null,
    areaField,
    options,
    creatorRole: user.role,
    inheritedAreaLabel,
  });
}
