import { requireUser, getHouseholdProfileView, ROLE_LABELS, COMMITTEE_ROLE_LABELS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageContainer, SectionCard } from "@/components/layout/PageContainer";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { EditSelfProfileForm } from "@/components/profile/EditSelfProfileForm";
import { LineConnectButton } from "@/components/profile/LineConnectButton";

export default async function ProfilePage() {
  const user = await requireUser();
  const roleLabel = ROLE_LABELS[user.role];
  const committeeRoleLabel = user.committeeRole ? COMMITTEE_ROLE_LABELS[user.committeeRole] : null;

  const dbUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { phoneNumber: true, email: true, lineId: true },
  });
  const householdView = user.role === "HOUSEHOLD" ? await getHouseholdProfileView(user) : null;
  const committeeProfile =
    user.role === "VILLAGE_COMMITTEE" ? await prisma.committeeProfile.findUnique({ where: { userId: user.id } }) : null;
  const officialProfile =
    user.role !== "HOUSEHOLD" && user.role !== "VILLAGE_COMMITTEE"
      ? await prisma.officialProfile.findUnique({ where: { userId: user.id } })
      : null;

  return (
    <PageContainer title="บัญชีของฉัน" subtitle="ข้อมูลบัญชีผู้ใช้งานและการเปลี่ยนรหัสผ่าน">
      <SectionCard title="ข้อมูลบัญชี">
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">ชื่อผู้ใช้</dt>
            <dd className="font-medium text-slate-900">{user.username}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">ชื่อที่แสดง</dt>
            <dd className="font-medium text-slate-900">{user.displayName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">บทบาท</dt>
            <dd className="font-medium text-slate-900">
              {roleLabel}
              {committeeRoleLabel ? ` (${committeeRoleLabel})` : ""}
            </dd>
          </div>
        </dl>
      </SectionCard>

      {householdView && (
        <SectionCard title="ข้อมูลครัวเรือนเป้าหมาย" description="ข้อมูลตามทะเบียนครัวเรือน — แก้ไขได้ที่หน้า &quot;ทะเบียนครัวเรือน&quot; เท่านั้น">
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">ลำดับที่ครัวเรือนเป้าหมาย</dt>
              <dd className="font-medium text-slate-900">{householdView.targetRank}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">บ้านเลขที่</dt>
              <dd className="font-medium text-slate-900">{householdView.houseNumber ?? "-"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">หมู่ที่</dt>
              <dd className="font-medium text-slate-900">{householdView.moo}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">จำนวนสมาชิกในครัวเรือน</dt>
              <dd className="font-medium text-slate-900">{householdView.familyMemberCount ?? "-"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">อายุ</dt>
              <dd className="font-medium text-slate-900">{householdView.age ?? "-"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">อาชีพ</dt>
              <dd className="font-medium text-slate-900">{householdView.occupation ?? "-"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">ผู้ให้ความยินยอม</dt>
              <dd className="font-medium text-slate-900">
                {householdView.consentPersonName ? `${householdView.consentPersonName} (${householdView.consentRelation ?? "-"})` : "-"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">รายได้ก่อนยืม (จปฐ.)</dt>
              <dd className="font-medium text-slate-900">
                {householdView.incomeBefore != null ? `${householdView.incomeBefore.toLocaleString("th-TH")} บาท` : "-"}
              </dd>
            </div>
          </dl>
        </SectionCard>
      )}

      {committeeProfile && (
        <SectionCard title="วาระการดำรงตำแหน่ง">
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">วันที่เริ่มวาระ</dt>
              <dd className="font-medium text-slate-900">
                {committeeProfile.termStartDate ? new Date(committeeProfile.termStartDate).toLocaleDateString("th-TH") : "-"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">วันที่สิ้นสุดวาระ</dt>
              <dd className="font-medium text-slate-900">
                {committeeProfile.termEndDate ? new Date(committeeProfile.termEndDate).toLocaleDateString("th-TH") : "-"}
              </dd>
            </div>
          </dl>
        </SectionCard>
      )}

      {officialProfile?.positionTitle && (
        <SectionCard title="ข้อมูลตำแหน่งราชการ">
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">ตำแหน่งทางการ</dt>
              <dd className="font-medium text-slate-900">{officialProfile.positionTitle}</dd>
            </div>
          </dl>
        </SectionCard>
      )}

      <SectionCard title="แก้ไขข้อมูลติดต่อ" description="เบอร์โทรศัพท์และอีเมลใช้สำหรับการแจ้งเตือนและกู้คืนรหัสผ่านของระบบ">
        <EditSelfProfileForm
          role={user.role}
          phoneNumber={dbUser.phoneNumber}
          email={dbUser.email}
          firstName={committeeProfile?.firstName ?? officialProfile?.firstName}
          lastName={committeeProfile?.lastName ?? officialProfile?.lastName}
        />
      </SectionCard>

      <SectionCard title="การแจ้งเตือนผ่าน LINE" description="เชื่อมต่อบัญชี LINE ของคุณเพื่อรับการแจ้งเตือนจากระบบ">
        <LineConnectButton connected={!!dbUser.lineId} />
      </SectionCard>

      <SectionCard title="เปลี่ยนรหัสผ่าน" description="กรอกรหัสผ่านเดิมและรหัสผ่านใหม่ที่ต้องการเปลี่ยน">
        <ChangePasswordForm />
      </SectionCard>
    </PageContainer>
  );
}
