export type RiskStatusValue = "NORMAL" | "WATCHLIST" | "HIGH_RISK";

export type SmartFilters = {
  q: string;
  provinceId: string;
  districtId: string;
  subDistrictId: string;
  villageId: string;
  riskStatuses: RiskStatusValue[];
  minIncome: string;
  maxIncome: string;
  occupation: string;
  page: number;
  pageSize: number;
  sortField: "sequenceNo" | "headFirstName" | "incomeBeforeLoan" | "outstandingBalance" | "riskStatus";
  sortDir: "asc" | "desc";
};

export const DEFAULT_FILTERS: SmartFilters = {
  q: "",
  provinceId: "",
  districtId: "",
  subDistrictId: "",
  villageId: "",
  riskStatuses: [],
  minIncome: "",
  maxIncome: "",
  occupation: "",
  page: 1,
  pageSize: 20,
  sortField: "sequenceNo",
  sortDir: "asc",
};

export function buildSearchParams(filters: SmartFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.provinceId) params.set("provinceId", filters.provinceId);
  if (filters.districtId) params.set("districtId", filters.districtId);
  if (filters.subDistrictId) params.set("subDistrictId", filters.subDistrictId);
  if (filters.villageId) params.set("villageId", filters.villageId);
  if (filters.riskStatuses.length > 0) params.set("riskStatuses", filters.riskStatuses.join(","));
  if (filters.minIncome) params.set("minIncome", filters.minIncome);
  if (filters.maxIncome) params.set("maxIncome", filters.maxIncome);
  if (filters.occupation) params.set("occupation", filters.occupation);
  return params;
}

export type ScopedAreaOptions = {
  provinces: { id: number; name: string }[];
  districts: { id: number; name: string; provinceId: number }[];
  subDistricts: { id: number; name: string; districtId: number }[];
  villages: { id: number; villageNo: string; villageName: string; subDistrictId: number }[];
};

export type SmartSearchRow = {
  id: number;
  sequenceNo: number;
  headFirstName: string;
  headLastName: string;
  villageId: number;
  villageName: string;
  villageNo: string;
  subDistrictName: string;
  districtName: string;
  provinceName: string;
  incomeBeforeLoan: number | null;
  occupation: string | null;
  outstandingBalance: number;
  riskStatus: RiskStatusValue;
};
