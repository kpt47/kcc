import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { householdSearchSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, householdSelfScopeWhere } from "@/lib/scope";

// ค้นหา/กรองครัวเรือนเป้าหมาย — ชื่อ, ลำดับที่ครัวเรือนเป้าหมาย, หรือรายได้ต่ำกว่าเกณฑ์ที่กำหนด
// ใช้ scope เดียวกับ GET /api/households (isolation ตามพื้นที่รับผิดชอบ)
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const url = new URL(request.url);
  const parsed = householdSearchSchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    targetRank: url.searchParams.get("targetRank") ? Number(url.searchParams.get("targetRank")) : undefined,
    maxIncome: url.searchParams.get("maxIncome") ? Number(url.searchParams.get("maxIncome")) : undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { q, targetRank, maxIncome } = parsed.data;

  const scope = await getAllowedVillageIds(user);

  const households = await prisma.targetHousehold.findMany({
    where: {
      AND: [
        householdSelfScopeWhere(user, scope),
        q
          ? {
              OR: [{ headFirstName: { contains: q } }, { headLastName: { contains: q } }],
            }
          : {},
        targetRank !== undefined ? { sequenceNo: targetRank } : {},
        maxIncome !== undefined ? { incomeBeforeLoan: { lte: maxIncome } } : {},
      ],
    },
    orderBy: [{ villageId: "asc" }, { sequenceNo: "asc" }],
    select: {
      id: true,
      sequenceNo: true,
      headFirstName: true,
      headLastName: true,
      houseNo: true,
      incomeBeforeLoan: true,
      village: { select: { villageName: true, villageNo: true } },
    },
  });

  return NextResponse.json(households);
}
