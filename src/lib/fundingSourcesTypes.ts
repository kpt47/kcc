// ชนิดข้อมูลที่ใช้ร่วมกันระหว่าง API route (/api/funding-sources/nearby) กับ component ฝั่ง client
// แยกไว้ต่างหากเพื่อไม่ให้ client component ต้อง import จากไฟล์ route.ts โดยตรง (ซึ่งมักผูกกับโค้ดฝั่งเซิร์ฟเวอร์)
export type NearbyVillageFund = { id: number; name: string; distanceKm: number; latitude: number; longitude: number };

// หมวดแหล่งทุน/สถาบันการเงินที่ดึงพิกัดจริงจากแผนที่ออนไลน์ (Overpass API/OpenStreetMap) — ครอบคลุมมากกว่าแค่
// "ธนาคาร" เดิม โดยจับคู่ทั้ง tag มาตรฐาน (amenity=bank/marketplace, office=cooperative) และค้นชื่อสถานที่
// ที่มีคำเฉพาะของไทย (กองทุน/สหกรณ์/วิสาหกิจชุมชน/โอทอป ฯลฯ) เพราะ OSM ไม่มี tag แยกสำหรับหมวดเหล่านี้โดยตรง
export type FundingSourceCategory =
  | "bank"
  | "islamic_bank"
  | "cooperative"
  | "market"
  | "community_fund"
  | "otop"
  | "enterprise"
  | "other";

export const FUNDING_CATEGORY_LABEL: Record<FundingSourceCategory, string> = {
  bank: "ธนาคาร",
  islamic_bank: "ธนาคารอิสลาม",
  cooperative: "สหกรณ์",
  market: "ตลาดนัด",
  community_fund: "กองทุนชุมชน",
  otop: "OTOP",
  enterprise: "วิสาหกิจชุมชน",
  other: "แหล่งทุนอื่นๆ",
};

export const FUNDING_CATEGORY_COLOR: Record<FundingSourceCategory, string> = {
  bank: "#2563eb",
  islamic_bank: "#059669",
  cooperative: "#0d9488",
  market: "#f97316",
  community_fund: "#c026d3",
  otop: "#d97706",
  enterprise: "#65a30d",
  other: "#64748b",
};

export type NearbyPlace = {
  id: string;
  name: string;
  category: FundingSourceCategory;
  distanceKm: number;
  latitude: number;
  longitude: number;
};

export type FundingSourcesNearbyResponse =
  | {
      hasCoordinates: false;
      villageName: string;
      radiusKm: number;
      villageFunds: NearbyVillageFund[];
      places: NearbyPlace[];
      placesUnavailable: false;
    }
  | {
      hasCoordinates: true;
      villageName: string;
      center: { latitude: number; longitude: number };
      radiusKm: number;
      villageFunds: NearbyVillageFund[];
      places: NearbyPlace[];
      placesUnavailable: boolean;
    };
