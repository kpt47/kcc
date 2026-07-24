import { PageContainer, SectionCard } from "@/components/layout/PageContainer";
import { NewUserModal } from "@/components/users/NewUserModal";
import { EditUserAction } from "@/components/users/EditUserAction";
import { ResetPasswordAction } from "@/components/users/ResetPasswordAction";
import { prisma } from "@/lib/prisma";
import { computeDisplayName, requireUser, ROLE_LABELS, COMMITTEE_ROLE_LABELS } from "@/lib/auth";
import { canManageTargetRole, getManagedUserWhere, isUserManager } from "@/lib/userManagement";
import { PDPA_POLICY_VERSION } from "@/lib/pdpa";
import { formatThaiDate } from "@/lib/thai";

export const dynamic = "force-dynamic";

function areaLabel(u: {
  scopeVillage: { villageName: string; villageNo: string } | null;
  scopeSubDistrict: { name: string } | null;
  scopeDistrict: { name: string } | null;
  scopeProvince: { name: string } | null;
}): string {
  if (u.scopeVillage) return `หมู่ ${u.scopeVillage.villageNo} บ้าน${u.scopeVillage.villageName}`;
  if (u.scopeSubDistrict) return `ต.${u.scopeSubDistrict.name}`;
  if (u.scopeDistrict) return `อ.${u.scopeDistrict.name}`;
  if (u.scopeProvince) return `จ.${u.scopeProvince.name}`;
  return "-";
}

export default async function UsersPage() {
  const user = await requireUser();

  if (!isUserManager(user)) {
    return (
      <PageContainer title="จัดการผู้ใช้งาน" subtitle="Top-Down User Provisioning">
        <SectionCard title="ไม่มีสิทธิ์เข้าถึง">
          <p className="text-sm text-slate-600">
            หน้านี้สำหรับผู้ดูแลระบบตั้งแต่ระดับพัฒนากรขึ้นไป หรือประธาน/เลขานุการคณะกรรมการหมู่บ้านเท่านั้น
          </p>
        </SectionCard>
      </PageContainer>
    );
  }

  const usersRaw = await prisma.user.findMany({
    where: getManagedUserWhere(user),
    orderBy: [{ role: "asc" }, { username: "asc" }],
    select: {
      id: true,
      username: true,
      role: true,
      committeeRole: true,
      phoneNumber: true,
      email: true,
      isActive: true,
      scopeVillage: { select: { villageName: true, villageNo: true } },
      scopeSubDistrict: { select: { name: true } },
      scopeDistrict: { select: { name: true } },
      scopeProvince: { select: { name: true } },
      householdProfile: true,
      committeeProfile: true,
      officialProfile: true,
      household: { select: { headFirstName: true, headLastName: true } },
      pdpaConsents: {
        where: { policyVersion: PDPA_POLICY_VERSION },
        orderBy: { acceptedAt: "desc" },
        take: 1,
        select: { acceptedAt: true },
      },
    },
  });
  const users = usersRaw.map((u) => ({ ...u, displayName: computeDisplayName(u) }));

  return (
    <PageContainer title="จัดการผู้ใช้งาน" subtitle="รายชื่อผู้ใช้งานที่อยู่ในความดูแลของคุณ (Top-Down Provisioning)">
      <div className="flex items-center justify-between gap-3">
        <span />
        <NewUserModal />
      </div>

      {users.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          ยังไม่มีผู้ใช้งานในความดูแลของคุณ
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {users.map((u) => {
            const manageable = canManageTargetRole(user, u.role) && u.id !== user.id;
            return (
              <div key={u.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-bold text-slate-900">
                      {u.displayName} <span className="font-normal text-slate-400">({u.username})</span>
                    </p>
                    <p className="text-sm text-slate-600">
                      {ROLE_LABELS[u.role]}
                      {u.committeeRole ? ` · ${COMMITTEE_ROLE_LABELS[u.committeeRole]}` : ""} · {areaLabel(u)}
                    </p>
                    <p className="text-sm text-slate-500">เบอร์โทรศัพท์: {u.phoneNumber}</p>
                    <p className="text-sm text-slate-500">อีเมล: {u.email}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        u.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {u.isActive ? "ใช้งานอยู่" : "ถูกระงับ"}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        u.pdpaConsents[0] ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {u.pdpaConsents[0]
                        ? `ยอมรับ PDPA แล้ว (${formatThaiDate(u.pdpaConsents[0].acceptedAt)})`
                        : "ยังไม่ยอมรับ PDPA"}
                    </span>
                  </div>
                </div>

                {manageable && (
                  <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
                    <div className="flex flex-wrap gap-2">
                      <EditUserAction
                        userId={u.id}
                        displayName={u.displayName}
                        role={u.role}
                        committeeRole={u.committeeRole}
                        phoneNumber={u.phoneNumber}
                        email={u.email}
                        isActive={u.isActive}
                        isVillageCommittee={u.role === "VILLAGE_COMMITTEE"}
                        householdProfile={u.householdProfile}
                        committeeProfile={u.committeeProfile}
                        officialProfile={u.officialProfile}
                      />
                      <ResetPasswordAction userId={u.id} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
