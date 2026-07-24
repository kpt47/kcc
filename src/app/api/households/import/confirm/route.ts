import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, getCurrentUser } from "@/lib/auth";
import { ACCESS_DENIED_MESSAGE, canImportHouseholds } from "@/lib/authz";
import { resolveImportVillageId, validateImportRows, type ImportRowInput } from "@/lib/householdImport";

// บันทึกผลการนำเข้าจริงลงฐานข้อมูล — ตรวจสอบซ้ำฝั่งเซิร์ฟเวอร์เสมอ (ห้ามเชื่อผลตรวจสอบจาก client) และต้อง
// ถูกต้อง 100% ทุกแถวจึงจะบันทึก ใช้ Prisma $transaction เดียวครอบทั้งชุด หากแถวใดล้มเหลวระหว่างบันทึกจริง
// (เช่น username ชนกันจาก race condition) ให้ยกเลิกทั้งชุด ไม่บันทึกบางส่วนค้างไว้
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });
  if (!canImportHouseholds(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: { formErrors: ["ข้อมูลที่ส่งมาไม่ถูกต้อง"] } }, { status: 400 });
  }
  const requestedVillageId = body.villageId ? Number(body.villageId) : undefined;
  const rows: ImportRowInput[] = body.rows;

  const villageId = await resolveImportVillageId(user, requestedVillageId);
  if (!villageId) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบหมู่บ้านที่ระบุ หรือหมู่บ้านนี้ไม่อยู่ในเขตอำนาจของคุณ"] } }, { status: 403 });
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: { formErrors: ["ไม่มีข้อมูลที่จะบันทึก"] } }, { status: 400 });
  }

  const revalidated = await validateImportRows(rows, villageId);
  if (!revalidated.allValid) {
    return NextResponse.json(
      { error: { formErrors: ["ข้อมูลบางแถวยังไม่ถูกต้อง กรุณาแก้ไขให้ครบก่อนบันทึก"] }, rows: revalidated.rows },
      { status: 400 }
    );
  }

  const passwordHashes = await Promise.all(revalidated.rows.map((r) => hashPassword(r.password!)));

  // แต่ละแถวมี 1-2 คำสั่งในทรานแซกชันเดียวกัน: เปิดบัญชีผู้ใช้เสมอ + อัปเดตเบอร์โทรศัพท์ครัวเรือน (ทะเบียนเล่มม่วง)
  // เฉพาะแถวที่กรอก "เบอร์โทรศัพท์ครัวเรือน" มา (ไม่บังคับ) — ไม่ทับข้อมูลเดิมด้วยค่าว่างถ้าไม่ได้กรอก
  const operations = revalidated.rows.flatMap((r, i) => {
    const createUser = prisma.user.create({
      data: {
        username: r.username!,
        passwordHash: passwordHashes[i],
        role: "HOUSEHOLD",
        phoneNumber: r.phoneNumber!,
        // ไฟล์ Excel นำเข้าไม่มีคอลัมน์อีเมล — สร้างอีเมลชั่วคราวจาก username (ไม่ซ้ำแน่นอน เพราะ username unique)
        // ครัวเรือนแก้ไขเป็นอีเมลจริงของตนเองภายหลังได้เองที่หน้า "บัญชีของฉัน" (/profile)
        email: `${r.username!}@kokkhocho.local`,
        scopeVillageId: villageId,
        householdId: r.matchedHouseholdId!,
        householdProfile: {
          create: {
            age: r.age !== undefined && r.age !== null && r.age !== "" ? Number(r.age) : undefined,
            occupation: r.occupation || undefined,
            consentPersonName: r.consentPersonName || undefined,
            consentRelation: r.consentRelation || undefined,
          },
        },
      },
      select: { id: true },
    });
    if (!r.householdPhoneNumber) return [createUser];
    const updateHouseholdPhone = prisma.targetHousehold.update({
      where: { id: r.matchedHouseholdId! },
      data: { phoneNumber: r.householdPhoneNumber },
      select: { id: true },
    });
    return [createUser, updateHouseholdPhone];
  });

  await prisma.$transaction(operations);

  return NextResponse.json({ createdCount: revalidated.rows.length });
}
