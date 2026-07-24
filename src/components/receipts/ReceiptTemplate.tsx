import { thaiBahtText } from "@/lib/thai";
import { formatThaiDate } from "@/lib/formatDate";

export type ReceiptData = {
  villageName: string;
  villageNo: string;
  subDistrictName: string;
  districtName: string;
  provinceName: string;
  payerName: string;
  contractNo: string | null;
  installmentNo: number;
  amount: number;
  paymentDate: string;
  outstandingBalanceAfter: number;
  chairmanName: string | null; // ประธานคณะกรรมการ กข.คจ. หมู่บ้าน — ค้นหาตามพื้นที่จริง (ดู lib/officials.ts)
  financeOrSecretaryName: string | null; // กรรมการผู้รับเงิน (FINANCE_MEMBER หรือ SECRETARY) — ค้นหาตามพื้นที่จริง
};

// เทมเพลตใบเสร็จรับเงิน (แบบรับคืนเงินยืมจากครัวเรือนเป้าหมาย) — จัดวางแบบสากล เหมาะสำหรับแคปเจอร์เป็น PDF
export function ReceiptTemplate({ data }: { data: ReceiptData }) {
  return (
    <div className="w-[700px] bg-white p-10 text-slate-900" style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}>
      <div className="border-b-2 border-slate-800 pb-4 text-center">
        <p className="text-lg font-bold">แบบรับคืนเงินยืม จากครัวเรือนเป้าหมาย</p>
        <p className="text-base font-semibold">ตามโครงการแก้ไขปัญหาความยากจน (กข.คจ.)</p>
        <p className="mt-2 text-sm">
          คณะกรรมการ กข.คจ. บ้าน{data.villageName} หมู่ที่ {data.villageNo} ตำบล{data.subDistrictName} อำเภอ
          {data.districtName} จังหวัด{data.provinceName}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm">
        <span className="font-semibold">เลขที่ใบเสร็จ: —</span>
        <span className="font-semibold">วันที่: {formatThaiDate(data.paymentDate)}</span>
      </div>

      <table className="mt-6 w-full text-sm">
        <tbody>
          <tr>
            <td className="w-40 py-1.5 align-top text-slate-500">ได้รับเงินจาก</td>
            <td className="py-1.5 font-semibold">{data.payerName}</td>
          </tr>
          <tr>
            <td className="py-1.5 align-top text-slate-500">สัญญาเลขที่</td>
            <td className="py-1.5 font-semibold">{data.contractNo ?? "-"}</td>
          </tr>
          <tr>
            <td className="py-1.5 align-top text-slate-500">งวดที่ชำระ</td>
            <td className="py-1.5 font-semibold">งวดที่ {data.installmentNo}</td>
          </tr>
          <tr>
            <td className="py-1.5 align-top text-slate-500">จำนวนเงินที่ชำระ</td>
            <td className="py-1.5 font-semibold">
              {data.amount.toLocaleString("th-TH")} บาท ({thaiBahtText(data.amount)})
            </td>
          </tr>
          <tr>
            <td className="py-1.5 align-top text-slate-500">ยอดคงเหลือเงินยืม</td>
            <td className="py-1.5 font-semibold">{data.outstandingBalanceAfter.toLocaleString("th-TH")} บาท</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-16 flex justify-between text-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <span>....................................................</span>
          {data.payerName && <span>({data.payerName})</span>}
          <span>ผู้จ่ายเงิน</span>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <span>....................................................</span>
          {data.financeOrSecretaryName && <span>({data.financeOrSecretaryName})</span>}
          <span>กรรมการผู้รับเงิน</span>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <span>....................................................</span>
          {data.chairmanName && <span>({data.chairmanName})</span>}
          <span>ประธานคณะกรรมการ กข.คจ.</span>
        </div>
      </div>
    </div>
  );
}
