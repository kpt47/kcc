// ออกเลขที่ "เล่มที่"/"โครงการที่"/"เลขที่" อัตโนมัติให้แบบเสนอโครงการและแบบขอยืมเงินทุนใหม่ — ไล่ลำดับจาก
// น้อยไปมากทั่วทั้งระบบ (ไม่แยกตามหมู่บ้าน เพราะเป็นเลขทะเบียนกลางอิงตามสมุดบัญชีจริง 1 เล่ม/100 โครงการ)
//
// "โครงการที่" (ProjectProposal) และ "เลขที่" (LoanRequest ที่ไม่ได้อ้างอิงแบบเสนอโครงการ) ใช้ตัวเลขจาก
// พูลเดียวกัน (ดู nextSharedCaseNumber) แม้จะเป็นคนละคอลัมน์คนละตาราง — เพราะเมื่อแบบขอยืมเงินทุนอ้างอิง
// แบบเสนอโครงการที่อนุมัติแล้ว (POST /api/loan-requests เมื่อมี proposalId) จะคัดลอกเลขเดิมมาใช้ตรงๆ
// (เลขทะเบียนเดียวกันของโครงการเดียวกัน ปรากฏได้ทั้งสองเล่ม) ถ้าแยกพูลกันจะมีโอกาสชนกัน เช่น แบบขอยืมเงินทุน
// แบบไม่อ้างอิงถูกออกเลขที่ 1 ไปแล้ว พอแบบเสนอโครงการเลขที่ 1 ได้รับอนุมัติและถูกใช้ยื่นขอยืมภายหลัง ก็จะ
// พยายามคัดลอกเลข 1 มาใส่ซ้ำกับที่มีอยู่แล้วไม่ได้
//
// ใช้ retry แทน transaction แบบ serializable เพราะระบบนี้มีผู้ยื่นพร้อมกันน้อยมาก (ระดับหมู่บ้าน) การชนกัน
// ของเลขที่จึงเกิดขึ้นได้ยากอยู่แล้ว — เมื่อชนกันจริง (unique constraint) จะคำนวณเลขถัดไปใหม่แล้วลองอีกครั้ง
import { prisma } from "./prisma";
import { Prisma } from "@/generated/prisma/client";

const ITEMS_PER_VOLUME = 100;
const MAX_ATTEMPTS = 5;

function volumeNoFor(sequenceNo: number): number {
  return Math.floor((sequenceNo - 1) / ITEMS_PER_VOLUME) + 1;
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function nextSharedCaseNumber(): Promise<number> {
  const [maxProposal, maxLoanRequest] = await Promise.all([
    prisma.projectProposal.aggregate({ _max: { proposalNo: true } }),
    prisma.loanRequest.aggregate({ _max: { requestNo: true } }),
  ]);
  return Math.max(maxProposal._max.proposalNo ?? 0, maxLoanRequest._max.requestNo ?? 0) + 1;
}

/** ออกเลขที่ "โครงการที่" ให้แบบเสนอโครงการใหม่โดยอัตโนมัติ (เล่มที่คำนวณจาก 100 โครงการ/เล่ม) */
export async function createProposalWithAutoNumber<T>(
  build: (numbers: { volumeNo: number; proposalNo: number }) => Promise<T>
): Promise<T> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const proposalNo = await nextSharedCaseNumber();
    try {
      return await build({ volumeNo: volumeNoFor(proposalNo), proposalNo });
    } catch (error) {
      if (!isUniqueConstraintError(error) || attempt === MAX_ATTEMPTS - 1) throw error;
    }
  }
  throw new Error("ไม่สามารถออกเลขที่โครงการอัตโนมัติได้ กรุณาลองใหม่อีกครั้ง");
}

/** ออกเลขที่ "เลขที่" ให้แบบขอยืมเงินทุนใหม่ที่ไม่ได้อ้างอิงแบบเสนอโครงการ — หลักการเดียวกับข้างต้น */
export async function createLoanRequestWithAutoNumber<T>(
  build: (numbers: { volumeNo: number; requestNo: number }) => Promise<T>
): Promise<T> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const requestNo = await nextSharedCaseNumber();
    try {
      return await build({ volumeNo: volumeNoFor(requestNo), requestNo });
    } catch (error) {
      if (!isUniqueConstraintError(error) || attempt === MAX_ATTEMPTS - 1) throw error;
    }
  }
  throw new Error("ไม่สามารถออกเลขที่คำขอกู้อัตโนมัติได้ กรุณาลองใหม่อีกครั้ง");
}
