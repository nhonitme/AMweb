export type InventoryValuationJobStatus = "QUEUED" | "PROCESSING" | "DONE" | "ERROR";

export type InventoryValuationRequest = {
  FROM_YMD: string;
  TO_YMD: string;
  PRODUCT_CDS?: string;
  STORE_CDS?: string;
  METHOD_CODE?: InventoryValuationMethodCode;
};

export type InventoryValuationStartJobResult = {
  jobId: string;
  status: InventoryValuationJobStatus;
  message?: string;
};

export type InventoryValuationJobProgress = {
  jobId: string;
  status: InventoryValuationJobStatus;
  percent: number;
  processedGroups: number;
  totalGroups: number;
  movementCount: number;
  methodCode: InventoryValuationMethodCode;
  methodName: string;
  message?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type InventoryValuationMethodCode =
  | "PERIOD_END_AVG"
  | "MOVING_AVG"
  | "FIFO"
  | "SPECIFIC";
