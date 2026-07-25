import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newLoanSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, canAccessHouseholdRecord } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canCreateOrUpdateLoan } from "@/lib/authz";
import { recomputeBankAccountBalances } from "@/lib/ledger";

// บัญชีคุมลูกหนี้ (เล่มเหลือง): เลขานุการ (SECRETARY) เท่านั้นเป็นผู้บันทึกรายการยืมเงินใหม่
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canCreateOrUpdateLoan(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = newLoanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const household = await prisma.targetHousehold.findUnique({ where: { id: data.householdId } });
  if (!household) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบครัวเรือนเป้าหมายที่เลือก"] } }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (!canAccessHouseholdRecord(user, scope, household)) {
    return NextResponse.json({ error: { formErrors: ["คุณไม่มีสิทธิ์บันทึกรายการยืมเงินให้ครัวเรือนนี้"] } }, { status: 403 });
  }

  if (data.loanRequestId !== undefined) {
    const loanRequest = await prisma.loanRequest.findUnique({
      where: { id: data.loanRequestId },
      select: { householdId: true, committeeDecision: true, loan: { select: { id: true } } },
    });
    if (
      !loanRequest ||
      loanRequest.householdId !== data.householdId ||
      loanRequest.committeeDecision !== "approved" ||
      loanRequest.loan
    ) {
      return NextResponse.json(
        { error: { formErrors: ["แบบขอยืมเงินทุนที่อ้างอิงไม่ถูกต้อง หรือถูกใช้ทำสัญญาไปแล้ว"] } },
        { status: 400 }
      );
    }
  }

  // ถอนเงินจากบัญชีธนาคารหมู่บ้านให้อัตโนมัติคู่กับการสร้างสัญญาเงินยืม (เล่มเขียว <-> เล่มเหลือง) กันยอด "เงินทุนรวม"
  // ซ้อนทับ — เงินก้อนเดียวกันถูกนับทั้งเป็นเงินฝากธนาคารและยอดเงินยืมพร้อมกันถ้าไม่มีรายการถอนคู่กัน มีบัญชีเดียว
  // ในหมู่บ้านใช้บัญชีนั้นอัตโนมัติ มีหลายบัญชีต้องระบุ bankAccountId มา ไม่มีบัญชีเลยข้ามขั้นตอนนี้ (เงินทุนคงอยู่
  // นอกระบบบัญชีธนาคารที่บันทึกไว้อยู่แล้ว ไม่มีอะไรให้ถอน)
  const villageBankAccounts = await prisma.bankAccount.findMany({ where: { villageId: household.villageId } });
  let targetBankAccountId: number | null = null;
  if (villageBankAccounts.length === 1) {
    targetBankAccountId = villageBankAccounts[0].id;
  } else if (villageBankAccounts.length > 1) {
    if (!data.bankAccountId || !villageBankAccounts.some((a) => a.id === data.bankAccountId)) {
      return NextResponse.json(
        { error: { formErrors: ["กรุณาเลือกบัญชีธนาคารที่จะถอนเงินจ่ายให้ครัวเรือน (หมู่บ้านนี้มีมากกว่า 1 บัญชี)"] } },
        { status: 400 }
      );
    }
    targetBankAccountId = data.bankAccountId;
  }

  if (targetBankAccountId !== null) {
    const latestTransaction = await prisma.bankTransaction.findFirst({
      where: { bankAccountId: targetBankAccountId },
      orderBy: [{ transactionDate: "desc" }, { id: "desc" }],
    });
    const currentBalance = latestTransaction?.balance ?? 0;
    if (currentBalance < data.amount) {
      return NextResponse.json(
        {
          error: {
            formErrors: [
              `ยอดเงินในบัญชีธนาคารที่เลือกไม่พอจ่าย (คงเหลือ ${currentBalance.toLocaleString("th-TH")} บาท ต้องการ ${data.amount.toLocaleString("th-TH")} บาท) กรุณาตรวจสอบบัญชีคุมเงินฝากก่อนบันทึกรายการยืมเงิน`,
            ],
          },
        },
        { status: 400 }
      );
    }
  }

  const loan = await prisma.loan.create({
    data: {
      householdId: data.householdId,
      loanRequestId: data.loanRequestId,
      borrowRound: data.borrowRound,
      contractNo: data.contractNo,
      amount: data.amount,
      receivedDate: new Date(data.receivedDate),
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      occupation: data.occupation,
      outstandingBalance: data.amount,
    },
  });

  if (targetBankAccountId !== null) {
    await prisma.bankTransaction.create({
      data: {
        bankAccountId: targetBankAccountId,
        transactionDate: new Date(data.receivedDate),
        documentNo: data.contractNo,
        description: `จ่ายเงินยืมให้ครัวเรือน ${household.headFirstName} ${household.headLastName} (ยืมครั้งที่ ${data.borrowRound})`,
        depositAmount: 0,
        withdrawAmount: data.amount,
        balance: 0, // คำนวณจริงโดย recomputeBankAccountBalances ด้านล่างทันที
      },
    });
    await recomputeBankAccountBalances(targetBankAccountId);
  }

  return NextResponse.json(loan, { status: 201 });
}
