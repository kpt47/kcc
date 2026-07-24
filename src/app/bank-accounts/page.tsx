import { PageContainer, SectionCard } from "@/components/layout/PageContainer";
import { BankTransactionAction } from "@/components/workflow/BankTransactionAction";
import { NewBankAccountAction } from "@/components/workflow/NewBankAccountAction";
import { BankAccountApproveAction } from "@/components/workflow/BankAccountApproveAction";
import { BankLedgerTable } from "@/components/workflow/BankLedgerTable";
import { BankLogo } from "@/components/workflow/BankLogo";
import { SearchSortList, type SearchSortItem } from "@/components/shared/SearchSortList";
import { SmartOmnibar } from "@/components/dashboard/SmartOmnibar";
import { prisma } from "@/lib/prisma";
import { THEMES } from "@/lib/theme";
import { requireUser } from "@/lib/auth";
import {
  canCreateBankTransaction,
  canEditOrDeleteBankTransaction,
  canViewBankLedger,
  canRequestBankAccount,
  canSignBankAccountAsChairman,
  canSignBankAccountAsFinance,
  isBankAccountFullyApproved,
  BANK_LEDGER_DENIED_MESSAGE,
} from "@/lib/authz";
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
      village: {
        select: {
          villageName: true,
          villageNo: true,
          subDistrict: { select: { name: true, district: { select: { name: true, province: { select: { name: true } } } } } },
        },
      },
      transactions: { orderBy: [{ transactionDate: "desc" }, { id: "desc" }] },
    },
  });
  const showTransactionAction = canCreateBankTransaction(user);
  const showManageActions = canEditOrDeleteBankTransaction(user);
  const canSignChairman = canSignBankAccountAsChairman(user);
  const canSignFinance = canSignBankAccountAsFinance(user);

  // เสนอให้ยื่นคำขอเปิดบัญชีใหม่ ถ้าหมู่บ้านของตนเอง (กรณีเลขาฯ/ฝ่ายการเงิน) ยังไม่มีบัญชีธนาคารในระบบ
  const ownVillageHasAccount = accounts.some((acc) => acc.villageId === user.scopeVillageId);
  const showRequestNewAccount = canRequestBankAccount(user) && user.scopeVillageId != null && !ownVillageHasAccount;

  return (
    <PageContainer title="บัญชีคุมเงินฝาก" subtitle="บัญชีเงินฝากธนาคารของกองทุนหมู่บ้าน กข.คจ.">
      <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${theme.badgeBg} ${theme.badgeText}`}>
        {theme.bookLabel}
      </span>

      {showRequestNewAccount && user.scopeVillageId != null && <NewBankAccountAction villageId={user.scopeVillageId} />}

      <SmartOmnibar />

      {accounts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          ยังไม่มีบัญชีเงินฝากธนาคารในระบบ — บันทึกรายการฝาก-ถอนของแต่ละหมู่บ้านเพื่อติดตามยอดคงเหลือที่นี่
        </p>
      ) : (
        (() => {
          const items: SearchSortItem[] = accounts.map((acc) => {
            const latestBalance = acc.transactions[0]?.balance ?? 0;
            const addr = acc.village.subDistrict;
            return {
              key: acc.id,
              searchText: [
                acc.village.villageNo,
                acc.village.villageName,
                addr.name,
                addr.district.name,
                addr.district.province.name,
                acc.bankName ?? "",
                acc.branch ?? "",
                acc.accountNo ?? "",
                acc.accountName ?? "",
              ]
                .join(" ")
                .toLowerCase(),
              sortValues: {
                village: `${acc.village.villageNo}${acc.village.villageName}`,
                bank: acc.bankName ?? "",
                balance: latestBalance,
              },
              node: (
                <div className={`flex flex-col gap-3 rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-4`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <BankLogo bankName={acc.bankName} />
                      <div>
                        <p className={`text-base font-bold ${theme.headingText}`}>
                          หมู่ {acc.village.villageNo} บ้าน{acc.village.villageName}
                        </p>
                        <p className="text-sm text-slate-600">
                          {acc.bankName ?? "ไม่ระบุธนาคาร"} {acc.branch ? `สาขา${acc.branch}` : ""} {acc.accountNo ? `เลขที่บัญชี ${acc.accountNo}` : ""}
                        </p>
                      </div>
                    </div>
                    {isBankAccountFullyApproved(acc) ? (
                      <span className={`shrink-0 rounded-full ${theme.badgeBg} ${theme.badgeText} px-2.5 py-1 text-xs font-semibold`}>
                        คงเหลือ {latestBalance.toLocaleString("th-TH")} บาท
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                        รอลงนามอนุมัติ
                      </span>
                    )}
                  </div>

                  {isBankAccountFullyApproved(acc) ? (
                    <>
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
                    </>
                  ) : (
                    <BankAccountApproveAction
                      accountId={acc.id}
                      chairmanApproved={acc.chairmanApprovedById !== null}
                      financeApproved={acc.financeApprovedById !== null}
                      canSignChairman={canSignChairman}
                      canSignFinance={canSignFinance}
                    />
                  )}
                </div>
              ),
            };
          });

          return (
            <SearchSortList
              items={items}
              defaultSortField="village"
              sortFields={[
                { value: "village", label: "หมู่บ้าน" },
                { value: "bank", label: "ธนาคาร" },
                { value: "balance", label: "ยอดคงเหลือ" },
              ]}
              searchPlaceholder="ค้นหาหมู่บ้าน, ตำบล/อำเภอ/จังหวัด, ธนาคาร, สาขา, เลขที่บัญชี..."
              emptyMessage="ไม่พบบัญชีที่ตรงกับการค้นหานี้"
            />
          );
        })()
      )}
    </PageContainer>
  );
}
