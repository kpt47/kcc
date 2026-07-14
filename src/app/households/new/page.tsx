import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { NewHouseholdForm } from "@/components/households/NewHouseholdForm";

export const dynamic = "force-dynamic";

// ประธาน/เลขานุการคณะกรรมการหมู่บ้าน (VILLAGE_COMMITTEE) ลงทะเบียนครัวเรือนได้เฉพาะหมู่บ้านของตนเองเท่านั้น —
// ดึงหมู่บ้านของผู้ใช้มาล็อกไว้ล่วงหน้าที่นี่ (server-side) ไม่ปล่อยให้เลือกหมู่บ้านเองที่ฝั่ง client
// ส่วนพัฒนากรตำบล (SUB_DISTRICT_ADMIN) ดูแลหลายหมู่บ้าน จึงยังเลือกหมู่บ้านจาก VillagePicker ได้ตามปกติ
export default async function NewHouseholdPage() {
  const user = await requireUser();

  const lockedVillage =
    user.role === "VILLAGE_COMMITTEE" && user.scopeVillageId
      ? await prisma.village.findUnique({
          where: { id: user.scopeVillageId },
          select: { id: true, villageNo: true, villageName: true },
        })
      : null;

  return (
    <NewHouseholdForm
      lockedVillage={lockedVillage ? { id: lockedVillage.id, label: `หมู่ ${lockedVillage.villageNo} บ้าน${lockedVillage.villageName}` } : null}
    />
  );
}
