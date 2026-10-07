import { downloadBlobFile } from "@/lib/fileUtils"
import axios from './axiosClient';
import { AxiosProgressEvent } from 'axios';
import { normalizeMessageLanguageKey } from '@/utils/language';
import { getApiObjectPayload } from './apiTypes';

export { isBackgroundJobFinished as isExcelImportJobFinished, waitAsync } from './jobApi';

export type ImportRowStatus = 'SUCCESS' | 'WARNING' | 'ERROR';
export type ExcelImportJobStatus = 'QUEUED' | 'PROCESSING' | 'DONE' | 'ERROR' | 'CANCELLED';

export interface ExcelImportResultRow {
  rowNo: number;
  status: ImportRowStatus;
  message: string;
  sheetName?: string;
  keyValue?: string;
}

export interface ExcelImportResponse {
  success: boolean;
  totalRows: number;
  successRows: number;
  warningRows: number;
  errorRows: number;
  message?: string;
  rows?: ExcelImportResultRow[];
  sheetName?: string;
}

export interface ExcelImportStartResult {
  jobId: string;
  status: ExcelImportJobStatus;
  message?: string;
}

export interface ExcelImportProgressResult {
  jobId: string;
  moduleCd?: string;
  status: ExcelImportJobStatus;
  percent: number;
  processedRows: number;
  totalRows: number;
  message?: string;
  result?: ExcelImportResponse | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientExcelImportContext {
  sheetName: string;
}

export interface BaseExcelImportPopupProps {
  visible: boolean;
  onClose: () => void;
  onImported?: (result: ExcelImportResponse) => void;
  onJobStarted?: (jobId: string) => void;
  title?: string;
  description?: string;
  moduleCd?: string;
  templateUrl?: string;
  startImportUrl?: string;
  progressUrl?: string;
  cancelImportUrl?: string;
  pollIntervalMs?: number;
  templateKeyName?: 'moduleCd' | string;
  templateFileName?: string;
  params?: Record<string, string | number | boolean | null | undefined>;
  fileFieldName?: string;
  closeAfterSuccess?: boolean;
  maxFileSizeMb?: number;
  headers?: Record<string, string>;
  onImportFile?: (file: File, context: ClientExcelImportContext) => Promise<ExcelImportResponse>;
  onDownloadTemplate?: () => void | boolean | Promise<void | boolean>;
  importMode?: 'server' | 'client';
  showTemplateDownload?: boolean;
  showSheetSelector?: boolean;
}

export interface StartExcelImportJobOptions {
  startImportUrl: string;
  fileFieldName: string;
  file: File;
  moduleCd: string;
  params?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  onUploadProgress?: (event: AxiosProgressEvent) => void;
}

export async function downloadExcelTemplate(moduleCd: string, lang?: string): Promise<Blob> {
  if (!moduleCd) {
    throw new Error('moduleCd is required to download template');
  }

  const params: Record<string, string> = { moduleCd };
  if (lang) params.lang = normalizeMessageLanguageKey(lang);

  const resp = await axios.get(`/System/DownloadTemplate`, {
    params,
    responseType: 'blob',
  });

  return resp.data;
}

export function buildFormData(
  fileFieldName: string,
  file: File,
  moduleCd: string,
  params?: Record<string, string | number | boolean | null | undefined>,
  screenCdParamName = 'moduleCd',
) {
  const formData = new FormData();

  formData.append(fileFieldName, file);

  if (fileFieldName !== 'file') {
    formData.append('file', file);
  }

  formData.append(screenCdParamName, moduleCd);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  return formData;
}

export function buildQueryParams(
  moduleCd: string,
  params?: Record<string, string | number | boolean | null | undefined>,
  moduleCdParamName = 'moduleCd',
) {
  const searchParams = new URLSearchParams();
  searchParams.append(moduleCdParamName, moduleCd);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  return searchParams;
}

export async function saveBlobFile(blob: Blob, fileName: string) {
  return downloadBlobFile(blob, fileName)
}

export function getProgressPercent(progressEvent: AxiosProgressEvent) {
  if (!progressEvent?.total || progressEvent.total <= 0) return 0;
  return Math.round((progressEvent.loaded * 100) / progressEvent.total);
}

export async function downloadTemplateFromUrl(
  templateUrl: string,
  moduleCd: string,
  params?: Record<string, string | number | boolean | null | undefined>,
  headers?: Record<string, string>,
  onDownloadProgress?: (event: AxiosProgressEvent) => void,
  templateKeyName = 'moduleCd',
  signal?: AbortSignal,
): Promise<Blob> {
  const queryParams = buildQueryParams(moduleCd, params, templateKeyName);
  const separator = templateUrl.includes('?') ? '&' : '?';
  const url = `${templateUrl}${separator}${queryParams.toString()}`;

  const response = await axios.get<Blob>(url, {
    signal,
    responseType: 'blob',
    headers,
    onDownloadProgress,
  });

  return response.data;
}

export async function startExcelImportJobByScreen({
  startImportUrl,
  fileFieldName,
  file,
  moduleCd,
  params,
  headers,
  onUploadProgress
}: StartExcelImportJobOptions): Promise<ExcelImportStartResult> {
  const formData = buildFormData(fileFieldName, file, moduleCd, params, 'moduleCd');

  const response = await axios.post(startImportUrl, formData, {
    headers: {
      ...(headers ?? {}),
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });

  return normalizeExcelImportStartResult(getApiObjectPayload(response.data));
}

export async function getExcelImportJobProgress(
  progressUrl: string,
  jobId: string,
  headers?: Record<string, string>,
): Promise<ExcelImportProgressResult> {
  const response = await axios.get(progressUrl, {
    params: { jobId },
    headers,
  });

  return normalizeExcelImportProgressResult(getApiObjectPayload(response.data));
}

/** Explicit Cancel Import only — do not call on F5 / menu change / browser close / logout. */
export async function cancelExcelImportJob(
  cancelImportUrl: string,
  jobId: string,
  headers?: Record<string, string>,
): Promise<void> {
  await axios.post(cancelImportUrl, null, {
    params: { jobId },
    headers,
  });
}

function isRecord(source: unknown): source is Record<string, unknown> {
  return Boolean(source) && typeof source === 'object';
}

function readValue<T>(source: unknown, camelName: string, pascalName: string, defaultValue: T): T {
  if (!isRecord(source)) return defaultValue;
  const camelValue = source[camelName];
  if (camelValue !== undefined && camelValue !== null) return camelValue as T;
  const pascalValue = source[pascalName];
  if (pascalValue !== undefined && pascalValue !== null) return pascalValue as T;
  return defaultValue;
}

export function normalizeExcelImportResponse(source: unknown): ExcelImportResponse {
  const rowsSource = readValue<unknown[]>(source, 'rows', 'Rows', []) ?? [];

  return {
    success: readValue<boolean>(source, 'success', 'Success', false),
    totalRows: readValue<number>(source, 'totalRows', 'TotalRows', 0),
    successRows: readValue<number>(source, 'successRows', 'SuccessRows', 0),
    warningRows: readValue<number>(source, 'warningRows', 'WarningRows', 0),
    errorRows: readValue<number>(source, 'errorRows', 'ErrorRows', 0),
    message: readValue<string | undefined>(source, 'message', 'Message', undefined),
    rows: rowsSource.map((row) => ({
      rowNo: readValue<number>(row, 'rowNo', 'RowNo', 0),
      status: readValue<ImportRowStatus>(row, 'status', 'Status', 'ERROR'),
      message: readValue<string>(row, 'message', 'Message', ''),
      sheetName: readValue<string | undefined>(row, 'sheetName', 'SheetName', undefined),
      keyValue: readValue<string | undefined>(row, 'keyValue', 'KeyValue', undefined),
    })),
    sheetName: readValue<string | undefined>(source, 'SheetName', 'SheetName', undefined),
  };
}

export function normalizeExcelImportStartResult(source: unknown): ExcelImportStartResult {
  return {
    jobId: readValue<string>(source, 'jobId', 'JobId', ''),
    status: readValue<ExcelImportJobStatus>(source, 'status', 'Status', 'QUEUED'),
    message: readValue<string | undefined>(source, 'message', 'Message', undefined),
  };
}

export function normalizeExcelImportProgressResult(source: unknown): ExcelImportProgressResult {
  const resultSource = readValue<unknown | null>(source, 'result', 'Result', null);

  return {
    jobId: readValue<string>(source, 'jobId', 'JobId', ''),
    moduleCd: readValue<string | undefined>(source, 'moduleCd', 'ModuleCd', undefined),
    status: readValue<ExcelImportJobStatus>(source, 'status', 'Status', 'QUEUED'),
    percent: readValue<number>(source, 'percent', 'Percent', 0),
    processedRows: readValue<number>(source, 'processedRows', 'ProcessedRows', 0),
    totalRows: readValue<number>(source, 'totalRows', 'TotalRows', 0),
    message: readValue<string | undefined>(source, 'message', 'Message', undefined),
    result: resultSource ? normalizeExcelImportResponse(resultSource) : null,
    createdAt: readValue<string | undefined>(source, 'createdAt', 'CreatedAt', undefined),
    updatedAt: readValue<string | undefined>(source, 'updatedAt', 'UpdatedAt', undefined),
  };
}
