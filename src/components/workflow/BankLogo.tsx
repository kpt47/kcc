import { getBankBrand } from "@/lib/bankBrand";

/** ป้ายโลโก้ธนาคารขนาดเล็ก (วงกลมสี + ตัวย่อ) — ดู lib/bankBrand.ts สำหรับที่มาของสี/ตัวย่อแต่ละธนาคาร */
export function BankLogo({ bankName, size = 32 }: { bankName: string | null | undefined; size?: number }) {
  const brand = getBankBrand(bankName);
  return (
    <span
      title={bankName ?? "ไม่ระบุธนาคาร"}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold leading-none"
      style={{
        width: size,
        height: size,
        backgroundColor: brand.bg,
        color: brand.text,
        fontSize: size <= 24 ? 7 : 9,
      }}
    >
      {brand.abbr}
    </span>
  );
}
