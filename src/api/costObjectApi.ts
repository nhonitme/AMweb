import API_BASE_URL from "@/config/apiConfig";
import axios from "@/api/axiosClient";
import { getApiObjectPayload } from "@/api/apiTypes";

export type CostObjectRow = {
  PRODUCT_ID: number;
  PRODUCT_CD: string;
  PRODUCT_NM_VIET: string;
  PRODUCT_NM_ENG?: string | null;
  DIVISION?: string | null;
  DEPARTMENT_ID?: number | null;
  DEPARTMENT_CD?: string | null;
  DEP_NAME_VIET?: string | null;
  STATUS: "REGISTERED" | "MISSING";
};

export type CostObjectOverview = {
  DIVISION_PREFIX: string;
  TOTAL: number;
  REGISTERED: number;
  MISSING: number;
  ITEMS: CostObjectRow[];
};

export type CostObjectSyncResult = {
  CREATED: number;
  EXISTS: number;
  FAILED: number;
  ITEMS: Array<{
    PRODUCT_ID: number;
    PRODUCT_CD: string;
    STATUS: string;
    MESSAGE: string;
  }>;
};

const URL = `${API_BASE_URL}/CostObject`;

export async function getCostObjectOverview(divisionPrefix: string): Promise<CostObjectOverview> {
  const result = await axios.get(URL, { params: { divisionPrefix } });
  return getApiObjectPayload<CostObjectOverview>(result.data);
}

export async function syncCostObjects(productIds: number[], divisionPrefix: string): Promise<CostObjectSyncResult> {
  const result = await axios.post(`${URL}/sync`, { ProductIds: productIds, DivisionPrefix: divisionPrefix });
  return getApiObjectPayload<CostObjectSyncResult>(result.data);
}
