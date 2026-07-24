// ออกเลขที่ "เล่มที่"/"โครงการที่" อัตโนมัติให้แบบเสนอโครงการใหม่ — ไล่ลำดับจากน้อยไปมากทั่วทั้งระบบ (ไม่แยก
// ตามหมู่บ้าน เพราะเป็นเลขทะเบียนกลางอิงตามสมุดบัญชีจริง 1 เล่ม/100 โครงการ)
//
// เทียบค่าสูงสุดกับทั้ง ProjectProposal.proposalNo และ LoanRequest.requestNo พร้อมกัน (ดู nextSharedCaseNumber)
// แม้ปัจจุบันแบบขอยืมเงินทุนใหม่ทุกฉบับจะต้องอ้างอิงแบบเสนอโครงการที่อนุมัติแล้วเสมอ (คัดลอกเลขจากโครงการนั้น
// มาใช้ตรงๆ ไม่ได้ออกเลขเองอีกต่อไป — ดู POST /api/loan-requests) แต่ข้อมูลเก่าก่อนกฎนี้อาจยังมี requestNo ที่
// ไม่ได้ผูกกับโครงการใดค้างอยู่ ถ้าเทียบเฉพาะ ProjectProposal เพียงตารางเดียวอาจออกเลขโครงการใหม่ชนกับ requestNo
// เก่าที่มีอยู่แล้วได้
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
