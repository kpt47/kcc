import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { householdSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, householdSelfScopeWhere } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canCreateHousehold } from "@/lib/authz";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });
  const scope = await getAllowedVillageIds(user);

  const households = await prisma.targetHousehold.findMany({
    where: householdSelfScopeWhere(user, scope),
    orderBy: [{ villageId: "asc" }, { sequenceNo: "asc" }],
    select: {
      id: true,
      sequenceNo: true,
      headFirstName: true,
      headLastName: true,
      houseNo: true,
      birthDate: true,
      occupation: true,
      village: {
        select: {
          villageName: true,
          villageNo: true,
          subDistrict: {
            select: {
              name: true,
              district: { select: { name: true, province: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });
  return NextResponse.json(households);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  // บัญชีทะเบียนครัวเรือนเป้าหมาย (เล่มม่วง): ประธาน/เลขานุการคณะกรรมการหมู่บ้าน หรือพัฒนากรตำบล เพิ่มรายชื่อพื้นฐานได้
  if (!canCreateHousehold(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = householdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    sequenceNo,
    titlePrefix,
    titlePrefixOther,
    headFirstName,
    headLastName,
    gender,
    birthDate,
    occupation,
    specialSkills,
    houseNo,
    memberCount,
    incomeBeforeLoan,
    incomeAfter1,
    incomeAfter2,
    incomeAfter3,
  } = parsed.data;

  // ประธาน/เลขานุการคณะกรรมการหมู่บ้าน (VILLAGE_COMMITTEE) เพิ่มครัวเรือนได้เฉพาะหมู่บ้านของตนเองเท่านั้น —
  // บังคับใช้ villageId จากบัญชีผู้ใช้ (scopeVillageId) เสมอ ไม่รับค่า villageId ที่ frontend ส่งมาเด็ดขาด
  // (ป้องกันการปลอมแปลง villageId ส่งมาสร้างครัวเรือนข้ามหมู่บ้าน) — ส่วนพัฒนากรตำบล (SUB_DISTRICT_ADMIN)
  // ยังเลือกหมู่บ้านได้ตามปกติ เพราะดูแลหลายหมู่บ้านในตำบลเดียวกัน จึงยังต้องตรวจสอบตามขอบเขต (scope) ต่อไป
  let villageId: number;
  if (user.role === "VILLAGE_COMMITTEE") {
    if (!user.scopeVillageId) {
      return NextResponse.json({ error: { formErrors: ["บัญชีของคุณยังไม่ได้ผูกกับหมู่บ้านใด"] } }, { status: 400 });
    }
    villageId = user.scopeVillageId;
  } else {
    villageId = parsed.data.villageId;
    const scope = await getAllowedVillageIds(user);
    if (scope !== "all" && !scope.includes(villageId)) {
      return NextResponse.json({ error: { formErrors: ["คุณไม่มีสิทธิ์เพิ่มครัวเรือนในหมู่บ้านนี้"] } }, { status: 403 });
    }
  }

  const existing = await prisma.targetHousehold.findUnique({
    where: { villageId_sequenceNo: { villageId, sequenceNo } },
  });
  if (existing) {
    return NextResponse.json(
      { error: { formErrors: [`มีครัวเรือนลำดับที่ ${sequenceNo} ในหมู่บ้านนี้อยู่แล้ว`] } },
      { status: 409 }
    );
  }

  const incomeRecords = [
    incomeAfter1 !== undefined ? { yearsAfterLoan: 1, income: incomeAfter1 } : null,
    incomeAfter2 !== undefined ? { yearsAfterLoan: 2, income: incomeAfter2 } : null,
    incomeAfter3 !== undefined ? { yearsAfterLoan: 3, income: incomeAfter3 } : null,
  ].filter((r): r is { yearsAfterLoan: number; income: number } => r !== null);

  const household = await prisma.targetHousehold.create({
    data: {
      villageId,
      sequenceNo,
      titlePrefix,
      titlePrefixOther: titlePrefix === "OTHER" ? titlePrefixOther : undefined,
      headFirstName,
      headLastName,
      gender,
      birthDate: birthDate ? new Date(birthDate) : undefined,
      occupation,
      specialSkills,
      houseNo,
      memberCount,
      incomeBeforeLoan,
      incomeRecords: incomeRecords.length > 0 ? { create: incomeRecords } : undefined,
    },
    include: { incomeRecords: true },
  });

  return NextResponse.json(household, { status: 201 });
}
