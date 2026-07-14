// ข้อมูลจำลอง (mock data) สำหรับทดสอบ Area-Based Isolation และ Workflow เอกสาร/บัญชีแบบแยกสิทธิ์
// จำลอง 2 พื้นที่แยกจากกันโดยสิ้นเชิง (คนละจังหวัด/อำเภอ/ตำบล) เพื่อพิสูจน์ว่าผู้ใช้พื้นที่หนึ่ง
// มองไม่เห็น/แก้ไขข้อมูลของอีกพื้นที่หนึ่งได้ — รันด้วย: npx prisma db seed
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TEST_PASSWORD = "Password123!";
// รหัสผ่านเฉพาะสำหรับชุดบัญชีทดสอบ RBAC ครบ 8 ระดับ (username ลงท้าย _test) — แยกจาก TEST_PASSWORD เดิม
// ตามที่ผู้ใช้กำหนดไว้ชัดเจน (password1234) ใช้ผ่าน upsertUser({ password: TEST_PASSWORD_LEVELS, ... })
const TEST_PASSWORD_LEVELS = "password1234";

async function upsertVillageHierarchy(input: {
  regionName: string;
  provinceName: string;
  districtName: string;
  subDistrictName: string;
  villageNo: string;
  villageName: string;
  budgetYear: number;
  budgetAmount: number;
}) {
  const region = await prisma.region.upsert({
    where: { name: input.regionName },
    create: { name: input.regionName },
    update: {},
  });
  const province = await prisma.province.upsert({
    where: { name: input.provinceName },
    create: { name: input.provinceName, regionId: region.id },
    update: {},
  });
  const district = await prisma.district.upsert({
    where: { provinceId_name: { provinceId: province.id, name: input.districtName } },
    create: { name: input.districtName, provinceId: province.id },
    update: {},
  });
  const subDistrict = await prisma.subDistrict.upsert({
    where: { districtId_name: { districtId: district.id, name: input.subDistrictName } },
    create: { name: input.subDistrictName, districtId: district.id },
    update: {},
  });
  const village = await prisma.village.upsert({
    where: { villageNo_subDistrictId: { villageNo: input.villageNo, subDistrictId: subDistrict.id } },
    create: {
      villageNo: input.villageNo,
      villageName: input.villageName,
      subDistrictId: subDistrict.id,
      budgetYear: input.budgetYear,
      budgetAmount: input.budgetAmount,
    },
    update: {},
  });
  return { province, district, subDistrict, village };
}

async function ensureBankAccount(villageId: number, bankName: string, accountNo: string) {
  const existing = await prisma.bankAccount.findFirst({ where: { villageId } });
  if (existing) return existing;
  return prisma.bankAccount.create({
    data: { villageId, bankName, branch: "สาขาในตัวเมือง", accountNo, accountName: "บัญชีกองทุน กข.คจ." },
  });
}

async function upsertUser(input: {
  username: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  role:
    | "HOUSEHOLD"
    | "VILLAGE_COMMITTEE"
    | "SUB_DISTRICT_ADMIN"
    | "DISTRICT_ADMIN"
    | "PROVINCIAL_ADMIN"
    | "GLOBAL_ADMIN"
    | "IT_SUPPORT";
  committeeRole?: "CHAIRMAN" | "SECRETARY" | "FINANCE_MEMBER" | "NORMAL_MEMBER" | null;
  scopeVillageId?: number;
  scopeSubDistrictId?: number;
  scopeDistrictId?: number;
  scopeProvinceId?: number;
  householdId?: number;
  positionTitle?: string;
  // HOUSEHOLD profile (ชื่อ-สกุลไม่บันทึกซ้ำที่นี่ — อยู่ที่ TargetHousehold แล้ว)
  age?: number;
  occupation?: string;
  consentPersonName?: string;
  consentRelation?: string;
  /** รหัสผ่านเฉพาะบัญชีนี้ (ถ้าไม่ระบุ ใช้ TEST_PASSWORD เริ่มต้น) */
  password?: string;
}) {
  const { username, firstName, lastName, role, positionTitle, age, occupation, consentPersonName, consentRelation, password, ...rest } =
    input;
  const passwordHash = await bcrypt.hash(password ?? TEST_PASSWORD, 10);

  const householdProfile = role === "HOUSEHOLD" ? { age, occupation, consentPersonName, consentRelation } : undefined;
  const committeeProfile = role === "VILLAGE_COMMITTEE" ? { firstName, lastName } : undefined;
  const officialProfile = role !== "HOUSEHOLD" && role !== "VILLAGE_COMMITTEE" ? { firstName, lastName, positionTitle } : undefined;

  return prisma.user.upsert({
    where: { username },
    create: {
      username,
      role,
      passwordHash,
      ...rest,
      householdProfile: householdProfile ? { create: householdProfile } : undefined,
      committeeProfile: committeeProfile ? { create: committeeProfile } : undefined,
      officialProfile: officialProfile ? { create: officialProfile } : undefined,
    },
    update: {
      role,
      passwordHash,
      ...rest,
      householdProfile: householdProfile ? { upsert: { create: householdProfile, update: householdProfile } } : undefined,
      committeeProfile: committeeProfile ? { upsert: { create: committeeProfile, update: committeeProfile } } : undefined,
      officialProfile: officialProfile ? { upsert: { create: officialProfile, update: officialProfile } } : undefined,
    },
  });
}

async function main() {
  // พื้นที่ A: จ.เชียงใหม่ > อ.เมือง > ต.ก. > หมู่บ้าน 1
  const areaA = await upsertVillageHierarchy({
    regionName: "ภาคเหนือ",
    provinceName: "เชียงใหม่",
    districtName: "เมือง",
    subDistrictName: "ต. ก.",
    villageNo: "1",
    villageName: "หมู่บ้าน 1",
    budgetYear: 2555,
    budgetAmount: 280_000,
  });
  const bankA = await ensureBankAccount(areaA.village.id, "ธนาคารออมสิน", "1-1111-11111-1");
  const householdMoo1 = await prisma.targetHousehold.upsert({
    where: { villageId_sequenceNo: { villageId: areaA.village.id, sequenceNo: 1 } },
    create: {
      villageId: areaA.village.id,
      sequenceNo: 1,
      headFirstName: "สมชาย",
      headLastName: "ครัวเรือนทดสอบ",
      houseNo: "1",
      incomeBeforeLoan: 15_000,
    },
    update: {},
  });

  // พื้นที่ B: จ.ขอนแก่น > อ.เมือง > ต.ข. > หมู่บ้าน 2
  const areaB = await upsertVillageHierarchy({
    regionName: "ภาคตะวันออกเฉียงเหนือ",
    provinceName: "ขอนแก่น",
    districtName: "เมือง",
    subDistrictName: "ต. ข.",
    villageNo: "2",
    villageName: "หมู่บ้าน 2",
    budgetYear: 2555,
    budgetAmount: 280_000,
  });
  await ensureBankAccount(areaB.village.id, "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร", "2-2222-22222-2");

  // พื้นที่ทดสอบ RBAC ครบ 8 ระดับ: จ.ก. > อ.ข. > ต.ค. > หมู่บ้าน ง. (รหัสผ่านทุกบัญชี: password1234)
  // ตั้งชื่อพื้นที่ตามลำดับตัวอักษรไทย (ก./ข./ค./ง.) ให้ตรงกับชื่อผู้ใช้งานแต่ละระดับตามที่ผู้ใช้ระบุไว้
  const areaTest = await upsertVillageHierarchy({
    regionName: "ภาคทดสอบ",
    provinceName: "จังหวัด ก.",
    districtName: "อำเภอ ข.",
    subDistrictName: "ตำบล ค.",
    villageNo: "9",
    villageName: "หมู่บ้าน ง.",
    budgetYear: 2555,
    budgetAmount: 280_000,
  });
  await ensureBankAccount(areaTest.village.id, "ธนาคารออมสิน", "9-9999-99999-9");
  const householdTest = await prisma.targetHousehold.upsert({
    where: { villageId_sequenceNo: { villageId: areaTest.village.id, sequenceNo: 1 } },
    create: {
      villageId: areaTest.village.id,
      sequenceNo: 1,
      headFirstName: "สมชาย",
      headLastName: "ทดสอบ",
      houseNo: "9",
      incomeBeforeLoan: 15_000,
    },
    update: {},
  });

  const users = await Promise.all([
    // สายบังคับบัญชาเหนือพื้นที่ A (สำหรับทดสอบ Top-Down User Provisioning ข้ามทุกระดับ)
    upsertUser({
      username: "admin_global",
      phoneNumber: "0811111101",
      email: "admin_global@kokkhocho.test",
      firstName: "ผู้บริหาร",
      lastName: "กรมการพัฒนาชุมชน (ส่วนกลาง)",
      role: "GLOBAL_ADMIN",
      positionTitle: "ผู้บริหารส่วนกลาง",
    }),
    upsertUser({
      username: "province_a",
      phoneNumber: "0811111102",
      email: "province_a@kokkhocho.test",
      firstName: "พัฒนาการ",
      lastName: "จังหวัดเชียงใหม่",
      role: "PROVINCIAL_ADMIN",
      scopeProvinceId: areaA.province.id,
      positionTitle: "พัฒนาการจังหวัด",
    }),
    upsertUser({
      username: "district_a",
      phoneNumber: "0811111103",
      email: "district_a@kokkhocho.test",
      firstName: "พัฒนาการ",
      lastName: "อำเภอเมืองเชียงใหม่",
      role: "DISTRICT_ADMIN",
      scopeDistrictId: areaA.district.id,
      positionTitle: "พัฒนาการอำเภอ",
    }),
    // พื้นที่ A
    upsertUser({
      username: "dev_tambon_a",
      phoneNumber: "0822222201",
      email: "dev_tambon_a@kokkhocho.test",
      firstName: "พัฒนากร",
      lastName: "ตำบล ก.",
      role: "SUB_DISTRICT_ADMIN",
      scopeSubDistrictId: areaA.subDistrict.id,
      positionTitle: "นักวิชาการพัฒนาชุมชน",
    }),
    upsertUser({
      username: "chair_moo1",
      phoneNumber: "0833333301",
      email: "chair_moo1@kokkhocho.test",
      firstName: "ประธานคณะกรรมการ",
      lastName: "หมู่บ้าน 1",
      role: "VILLAGE_COMMITTEE",
      committeeRole: "CHAIRMAN",
      scopeVillageId: areaA.village.id,
    }),
    upsertUser({
      username: "sec_moo1",
      phoneNumber: "0833333302",
      email: "sec_moo1@kokkhocho.test",
      firstName: "เลขานุการ",
      lastName: "หมู่บ้าน 1",
      role: "VILLAGE_COMMITTEE",
      committeeRole: "SECRETARY",
      scopeVillageId: areaA.village.id,
    }),
    upsertUser({
      username: "fin_moo1",
      phoneNumber: "0833333303",
      email: "fin_moo1@kokkhocho.test",
      firstName: "ฝ่ายการเงิน",
      lastName: "หมู่บ้าน 1",
      role: "VILLAGE_COMMITTEE",
      committeeRole: "FINANCE_MEMBER",
      scopeVillageId: areaA.village.id,
    }),
    upsertUser({
      username: "house_moo1",
      phoneNumber: "0844444401",
      email: "house_moo1@kokkhocho.test",
      firstName: "สมชาย",
      lastName: "ครัวเรือนทดสอบ",
      role: "HOUSEHOLD",
      scopeVillageId: areaA.village.id,
      householdId: householdMoo1.id,
      age: 45,
      occupation: "เกษตรกร",
      consentPersonName: "สมหญิง ครัวเรือนทดสอบ",
      consentRelation: "ภรรยา",
    }),
    // พื้นที่ B
    upsertUser({
      username: "dev_tambon_b",
      phoneNumber: "0822222202",
      email: "dev_tambon_b@kokkhocho.test",
      firstName: "พัฒนากร",
      lastName: "ตำบล ข.",
      role: "SUB_DISTRICT_ADMIN",
      scopeSubDistrictId: areaB.subDistrict.id,
      positionTitle: "นักวิชาการพัฒนาชุมชน",
    }),
    upsertUser({
      username: "chair_moo2",
      phoneNumber: "0855555501",
      email: "chair_moo2@kokkhocho.test",
      firstName: "ประธานคณะกรรมการ",
      lastName: "หมู่บ้าน 2",
      role: "VILLAGE_COMMITTEE",
      committeeRole: "CHAIRMAN",
      scopeVillageId: areaB.village.id,
    }),
    // ผู้ดูแลระบบด้านเทคนิค (IT_SUPPORT) — ไม่มีขอบเขตพื้นที่ ไม่เกี่ยวข้องกับข้อมูลโครงการ กข.คจ. เลย
    upsertUser({
      username: "it_support",
      phoneNumber: "0866666601",
      email: "it_support@kokkhocho.test",
      firstName: "ผู้ดูแลระบบ",
      lastName: "ฝ่ายเทคนิค",
      role: "IT_SUPPORT",
      positionTitle: "IT Support",
    }),

    // ===== ชุดบัญชีทดสอบ RBAC ครบ 8 ระดับ (username ลงท้าย _test, รหัสผ่านทุกบัญชี: password1234) =====
    // ระดับ 1: ส่วนกลาง
    upsertUser({
      username: "admin_test",
      phoneNumber: "0900000001",
      email: "admin_test@kokkhocho.test",
      firstName: "แอดมิน",
      lastName: "กรมการพัฒนาชุมชน",
      role: "GLOBAL_ADMIN",
      positionTitle: "ผู้บริหารส่วนกลาง",
      password: TEST_PASSWORD_LEVELS,
    }),
    // ระดับ 2: จังหวัด
    upsertUser({
      username: "prov_test",
      phoneNumber: "0900000002",
      email: "prov_test@kokkhocho.test",
      firstName: "พัฒนาการ",
      lastName: "จังหวัด ก.",
      role: "PROVINCIAL_ADMIN",
      scopeProvinceId: areaTest.province.id,
      positionTitle: "พัฒนาการจังหวัด",
      password: TEST_PASSWORD_LEVELS,
    }),
    // ระดับ 3: อำเภอ
    upsertUser({
      username: "dist_test",
      phoneNumber: "0900000003",
      email: "dist_test@kokkhocho.test",
      firstName: "พัฒนาการ",
      lastName: "อำเภอ ข.",
      role: "DISTRICT_ADMIN",
      scopeDistrictId: areaTest.district.id,
      positionTitle: "พัฒนาการอำเภอ",
      password: TEST_PASSWORD_LEVELS,
    }),
    // ระดับ 4: ตำบล
    upsertUser({
      username: "subdist_test",
      phoneNumber: "0900000004",
      email: "subdist_test@kokkhocho.test",
      firstName: "พัฒนากร",
      lastName: "ตำบล ค.",
      role: "SUB_DISTRICT_ADMIN",
      scopeSubDistrictId: areaTest.subDistrict.id,
      positionTitle: "นักวิชาการพัฒนาชุมชน",
      password: TEST_PASSWORD_LEVELS,
    }),
    // ระดับ 5: ประธานกรรมการหมู่บ้าน
    upsertUser({
      username: "chair_test",
      phoneNumber: "0900000005",
      email: "chair_test@kokkhocho.test",
      firstName: "ประธานกรรมการ",
      lastName: "หมู่บ้าน ง.",
      role: "VILLAGE_COMMITTEE",
      committeeRole: "CHAIRMAN",
      scopeVillageId: areaTest.village.id,
      password: TEST_PASSWORD_LEVELS,
    }),
    // ระดับ 6: ฝ่ายการเงิน (หมู่บ้านเดียวกับประธาน — ทดสอบเล่มเขียว/เล่มเหลือง/เล่มม่วงในขอบเขตเดียวกัน)
    upsertUser({
      username: "fin_test",
      phoneNumber: "0900000006",
      email: "fin_test@kokkhocho.test",
      firstName: "ฝ่ายการเงิน",
      lastName: "หมู่บ้าน ง.",
      role: "VILLAGE_COMMITTEE",
      committeeRole: "FINANCE_MEMBER",
      scopeVillageId: areaTest.village.id,
      password: TEST_PASSWORD_LEVELS,
    }),
    // ระดับ 7: ครัวเรือนเป้าหมาย (หมู่บ้านเดียวกับระดับ 5-6)
    upsertUser({
      username: "house_test",
      phoneNumber: "0900000007",
      email: "house_test@kokkhocho.test",
      firstName: "สมชาย",
      lastName: "ทดสอบ",
      role: "HOUSEHOLD",
      scopeVillageId: areaTest.village.id,
      householdId: householdTest.id,
      age: 45,
      occupation: "เกษตรกร",
      consentPersonName: "สมหญิง ทดสอบ",
      consentRelation: "ภรรยา",
      password: TEST_PASSWORD_LEVELS,
    }),
    // ระดับ 8: ผู้ดูแลระบบด้านไอที
    upsertUser({
      username: "it_test",
      phoneNumber: "0900000008",
      email: "it_test@kokkhocho.test",
      firstName: "เจ้าหน้าที่ไอที",
      lastName: "ส่วนกลาง",
      role: "IT_SUPPORT",
      positionTitle: "IT Support",
      password: TEST_PASSWORD_LEVELS,
    }),
  ]);

  console.log(`seed พื้นที่และผู้ใช้งานสำเร็จ: ${users.map((u) => u.username).join(", ")}`);
  console.log(`- บัญชีเดิม (รหัสผ่าน: ${TEST_PASSWORD}): admin_global, province_a, district_a, dev_tambon_a/b, chair_moo1/2, sec_moo1, fin_moo1, house_moo1, it_support`);
  console.log(
    `- ชุดทดสอบ RBAC ครบ 8 ระดับ (รหัสผ่าน: ${TEST_PASSWORD_LEVELS}): admin_test, prov_test, dist_test, subdist_test, chair_test, fin_test, house_test, it_test`
  );
  console.log("บัญชีเงินฝากพื้นที่ A:", bankA.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
