import { PageContainer, SectionCard } from "@/components/layout/PageContainer";
import { BankTransactionAction } from "@/components/workflow/BankTransactionAction";
import { BankLedgerTable } from "@/components/workflow/BankLedgerTable";
import { prisma } from "@/lib/prisma";
import { THEMES } from "@/lib/theme";
import { requireUser } from "@/lib/auth";
import { canCreateBankTransaction, canEditOrDeleteBankTransaction, canViewBankLedger, BANK_LEDGER_DENIED_MESSAGE } from "@/lib/authz";
import { getAllowedVillageIds, scopeWhereDirect } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function BankAccountsPage() {
  const user = await requireUser();

  // เล่มเขียว: ครัวเรือน (HOUSEHOLD) และ IT_SUPPORT ไม่มีสิทธิ์ดูบัญชีคุมเงินฝากธนาคารเด็ดขาด (ดู lib/authz.ts)
  if (!canViewBankLedger(user)) {
    return (
      <PageContainer title="บัญชีคุมเงินฝาก" subtitle="บัญชีเงินฝากธนาคารของกองทุนหมู่บ้าน กข.คจ.">
        <SectionCard title="ไม่มีสิทธิ์เข้าถึง">
          <p className="text-sm text-slate-600">{BANK_LEDGER_DENIED_MESSAGE}</p>
        </SectionCard>
      </PageContainer>
    );
  }

  const scope = await getAllowedVillageIds(user);
  const theme = THEMES.green;
  const accounts = await prisma.bankAccount.findMany({
    where: scopeWhereDirect(scope, "villageId"),
    include: {
      village: { select: { villageName: true, villageNo: true } },
      transactions: { orderBy: [{ transactionDate: "desc" }, { id: "desc" }] },
    },
  });
  const showTransactionAction = canCreateBankTransaction(user);
  const showManageActions = canEditOrDeleteBankTransaction(user);

  return (
    <PageContainer title="บัญชีคุมเงินฝาก" subtitle="บัญชีเงินฝากธนาคารของกองทุนหมู่บ้าน กข.คจ.">
      <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${theme.badgeBg} ${theme.badgeText}`}>
        {theme.bookLabel}
      </span>

      {accounts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          ยังไม่มีบัญชีเงินฝากธนาคารในระบบ — บันทึกรายการฝาก-ถอนของแต่ละหมู่บ้านเพื่อติดตามยอดคงเหลือที่นี่
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map((acc) => {
            const latestBalance = acc.transactions[0]?.balance ?? 0;
            return (
              <div key={acc.id} className={`flex flex-col gap-3 rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-4`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-base font-bold ${theme.headingText}`}>
                      หมู่ {acc.village.villageNo} บ้าน{acc.village.villageName}
                    </p>
                    <p className="text-sm text-slate-600">
                      {acc.bankName ?? "ไม่ระบุธนาคาร"} {acc.branch ? `สาขา${acc.branch}` : ""} {acc.accountNo ? `เลขที่บัญชี ${acc.accountNo}` : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full ${theme.badgeBg} ${theme.badgeText} px-2.5 py-1 text-xs font-semibold`}>
                    คงเหลือ {latestBalance.toLocaleString("th-TH")} บาท
                  </span>
                </div>

                <BankLedgerTable
                  rows={acc.transactions.map((t) => ({
                    id: t.id,
                    transactionDate: t.transactionDate.toISOString(),
                    documentNo: t.documentNo,
                    description: t.description,
                    depositAmount: t.depositAmount,
                    withdrawAmount: t.withdrawAmount,
                    balance: t.balance,
                    note: t.note,
                    passbookImageUrl: t.passbookImageUrl,
                  }))}
                  canManage={showManageActions}
                />

                {showTransactionAction && <BankTransactionAction bankAccountId={acc.id} />}
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
