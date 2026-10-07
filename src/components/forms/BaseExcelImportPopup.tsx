import { downloadFile } from "@/lib/fileUtils"
import { useCallback, useContext, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Popup from 'devextreme-react/popup';
import Button from 'devextreme-react/button';
import FileUploader, { FileUploaderTypes } from 'devextreme-react/file-uploader';
import ProgressBar from 'devextreme-react/progress-bar';
import DataGrid, { Column, Paging, Scrolling } from 'devextreme-react/data-grid';
import LoadPanel from 'devextreme-react/load-panel';
import ScrollView from 'devextreme-react/scroll-view';
import notify from 'devextreme/ui/notify';
import type { AxiosProgressEvent } from 'axios';
import '@/components/forms/css/base_excel_import_popup.scss';
import { getApiErrorMessage } from '@/api/apiTypes';
import {
  isBackgroundJobFinished,
  waitAsync,
} from '@/api/jobApi';
import {
  BaseExcelImportPopupProps,
  ExcelImportProgressResult,
  ExcelImportResponse,
  cancelExcelImportJob,
  downloadTemplateFromUrl,
  getExcelImportJobProgress,
  getProgressPercent,
  startExcelImportJobByScreen,
} from '@/api/excelApi';
import API_BASE_URL from '@/config/apiConfig';
import { LanguageContext } from "@/lib/i18nLoader";
import type dxPopup from "devextreme/ui/popup";
import { disableBuiltInPopupEscape, usePopupEscapeLayer } from "@/components/popup/popupEscapeStack";
import { overlayWrapperFromPopupContent, raiseOverlayAboveSiblings } from "@/components/popup/raiseOverlayZIndex";
import { visiblePopupCount } from "@/lib/popupShortcutScope";
import { queryKeys } from '@/lib/query/queryKeys';
import SelectBox from 'devextreme-react/select-box';
import * as XLSX from 'xlsx';

type ImportStep = 'IDLE' | 'DOWNLOADING_TEMPLATE' | 'READY' | 'UPLOADING' | 'IMPORTING' | 'DONE' | 'ERROR';

type ResultRowWithKey = NonNullable<ExcelImportResponse['rows']>[number] & { __key: string };
type FileUploaderInstanceLike = {
  reset?: () => void;
  clear?: () => void;
  option?: (name: string, value: unknown) => void;
  _inputElement?: HTMLInputElement;
};

type FileUploaderRefLike = FileUploaderInstanceLike & {
  instance?: FileUploaderInstanceLike;
  inputElement?: HTMLInputElement;
  _inputElement?: HTMLInputElement;
};

const DEFAULT_MAX_FILE_SIZE_MB = 20;
const DEFAULT_START_IMPORT_URL = `${API_BASE_URL}/excel-import-jobs/start`;
const DEFAULT_PROGRESS_URL = `${API_BASE_URL}/excel-import-jobs/progress`;
const DEFAULT_CANCEL_IMPORT_URL = `${API_BASE_URL}/excel-import-jobs/cancel`;
const DEFAULT_TEMPLATE_URL = `${API_BASE_URL}/System/DownloadTemplate`;
const DEFAULT_POLL_INTERVAL_MS = 1000;

export default function BaseExcelImportPopup({
  visible,
  onClose,
  onImported,
  onJobStarted,
  title = 'Import Excel',
  description,
  moduleCd = '',
  templateUrl = DEFAULT_TEMPLATE_URL,
  startImportUrl = DEFAULT_START_IMPORT_URL,
  progressUrl = DEFAULT_PROGRESS_URL,
  cancelImportUrl = DEFAULT_CANCEL_IMPORT_URL,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  templateKeyName = 'moduleCd',
  templateFileName,
  params,
  fileFieldName = 'file',
  closeAfterSuccess = false,
  maxFileSizeMb = DEFAULT_MAX_FILE_SIZE_MB,
  headers,
  onImportFile,
  onDownloadTemplate,
  importMode,
  showTemplateDownload = true,
  showSheetSelector = true,
}: BaseExcelImportPopupProps) {

  const queryClient = useQueryClient();
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState<string>('');
  const selectedSheetNameRef = useRef<string>('');

  const setSelectedSheetNameSafe = useCallback((value: string) => {
    const nextValue = value || '';
    selectedSheetNameRef.current = nextValue;
    setSelectedSheetName(nextValue);
  }, []);

  const { lang, translate } = useContext(LanguageContext) as { translate: (k: string, f?: string) => string; lang: string };
  const t = useCallback((key: string, fallback: string) => translate(key, fallback), [translate]);
  const format = useCallback((key: string, fallback: string, ...args: string[]) => {
    return args.reduce((value, arg, index) => value.replace(`{${index}}`, arg), t(key, fallback));
  }, [t]);
  const popupTitle = title === 'Import Excel' ? t('IMPORT_POPUP_TITLE', 'Import Excel') : title;
  const templateBaseName = String(templateFileName ?? (moduleCd || 'ImportTemplate'))
    .trim()
    .replace(/\.xlsx$/i, '')
    // Avoid double timestamp when callers already append ISO-like stamp.
    .replace(/_\d{8}T\d{6,9}Z?$/i, '');
  const resolvedTemplateFileName = `${templateBaseName || 'ImportTemplate'}_${new Date().toISOString().replace(/[:.-]/g, '')}.xlsx`;
  const useClientImport = typeof onImportFile === 'function';
  const resolvedImportMode = importMode ?? (useClientImport ? 'client' : 'server');
  const isClientImport = resolvedImportMode === 'client';
  const canDownloadTemplate = showTemplateDownload && (
    (!isClientImport && !!moduleCd) || typeof onDownloadTemplate === 'function'
  );
  const fileUploaderRef = useRef<FileUploaderRefLike | null>(null);
  const popupRef = useRef<dxPopup | null>(null);
  const popupWrapperRef = useRef<HTMLElement | null>(null);
  const [fileUploaderKey, setFileUploaderKey] = useState(0);
  const dragDepthRef = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropHost, setDropHost] = useState<HTMLDivElement | null>(null);
  const isPollingRef = useRef(false);
  /** Bumped on close / new import so in-flight async work can bail out safely. */
  const importSessionRef = useRef(0);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [step, setStep] = useState<ImportStep>('IDLE');
  const [progressValue, setProgressValue] = useState(0);
  const [processedRows, setProcessedRows] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [currentJobId, setCurrentJobId] = useState<string>('');
  const currentJobIdRef = useRef('');
  currentJobIdRef.current = currentJobId;
  const [jobMessage, setJobMessage] = useState<string>('');
  const [result, setResult] = useState<ExcelImportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const isBusy = step === 'DOWNLOADING_TEMPLATE' || step === 'UPLOADING' || step === 'IMPORTING';
  const canImport = !!selectedFile && !isBusy;
  const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

  const isSessionActive = useCallback((session: number) => {
    return session === importSessionRef.current && visibleRef.current;
  }, []);

  useEffect(() => {
    return () => {
      isPollingRef.current = false;
    };
  }, []);

  const clearFileUploader = useCallback(() => {
    const refAny = fileUploaderRef.current;
    if (!refAny) return;

    const inst = refAny.instance ?? refAny;
    if (!inst) return;

    if (typeof inst.reset === 'function') {
      inst.reset();
      return;
    }

    if (typeof inst.clear === 'function') {
      inst.clear();
      return;
    }

    if (typeof inst.option === 'function') {
      inst.option('value', []);
      return;
    }

    const inputEl = refAny.inputElement ?? refAny._inputElement ?? inst._inputElement;
    try {
      if (inputEl && typeof inputEl.value !== 'undefined') inputEl.value = '';
    } catch {
    }
  }, []);

  const statusText = useMemo(() => {
    if (jobMessage) return jobMessage;

    switch (step) {
      case 'DOWNLOADING_TEMPLATE':
        return t('STATUS_DL_TEMPLATE', 'Đang tải file mẫu...');
      case 'READY':
        return isClientImport
          ? t('CLIENT_STATUS_READY', 'File đã sẵn sàng để đọc vào lưới.')
          : t('STATUS_READY', 'File đã sẵn sàng để import.');
      case 'UPLOADING':
        return t('STATUS_UPLOADING', 'Đang upload file Excel...');
      case 'IMPORTING':
        return isClientImport
          ? t('CLIENT_STATUS_IMPORTING', 'Đang đọc file Excel và thêm dòng vào lưới...')
          : t('STATUS_IMPORTING', 'Server đang xử lý dữ liệu import...');
      case 'DONE':
        return isClientImport
          ? t('CLIENT_STATUS_DONE', 'Đã thêm dòng vào lưới.')
          : t('STATUS_DONE', 'Import hoàn tất.');
      case 'ERROR':
        return t('STATUS_ERROR', 'Import không thành công.');
      default:
        return isClientImport
          ? t('CLIENT_STATUS_IDLE', 'Chọn file Excel có các dòng hàng hóa cần thêm vào lưới.')
          : t('STATUS_IDLE', 'Vui lòng tải file mẫu, nhập dữ liệu, sau đó chọn file để import.');
    }
  }, [isClientImport, jobMessage, step, t]);

  /** Drop file selection after import finishes (success or error); keep result/error UI. */
  const clearFileKeepResult = useCallback(() => {
    clearFileUploader();
    setSelectedFile(null);
    setSheetNames([]);
    setSelectedSheetName('');
    setFileUploaderKey((prev) => prev + 1);
  }, [clearFileUploader]);

  const resetState = useCallback(() => {
    isPollingRef.current = false;
    setSelectedFile(null);
    setSheetNames([]);
    setSelectedSheetName('');
    setStep('IDLE');
    setProgressValue(0);
    setProcessedRows(0);
    setTotalRows(0);
    setCurrentJobId('');
    setJobMessage('');
    setResult(null);
    setErrorMessage('');
    clearFileUploader();

    setFileUploaderKey((prev) => prev + 1);
  }, [clearFileUploader]);

  // Reset UI only after parent actually hides — avoids aborting import via onHiding side-effects.
  useEffect(() => {
    if (visible) {
      return;
    }
    popupRef.current = null;
    popupWrapperRef.current = null;
    isPollingRef.current = false;
    importSessionRef.current += 1;
    resetState();
  }, [visible, resetState]);

  const handleClose = useCallback(() => {
    const jobIdToCancel = currentJobIdRef.current;
    const isImportInFlight = step === 'UPLOADING' || step === 'IMPORTING';
    const shouldCancelServerJob =
      !useClientImport
      && !!jobIdToCancel
      && isImportInFlight;

    // Stop client poll / UI. Server cancel ONLY on explicit Cancel Import (X), not F5/menu/logout.
    isPollingRef.current = false;
    importSessionRef.current += 1;

    if (shouldCancelServerJob) {
      void cancelExcelImportJob(cancelImportUrl, jobIdToCancel, headers).catch(() => {
        // ignore cancel errors — popup is already closing
      });
    }

    if (isImportInFlight) {
      notify(
        t('IMPORT_CANCELLED_NOTIFY', 'Đã hủy import Excel.'),
        'warning',
        2200,
      );
    }

    onClose();
  }, [cancelImportUrl, headers, onClose, step, t, useClientImport]);

  const handleDownloadTemplate = useCallback(async () => {
    const session = ++importSessionRef.current;

    if (typeof onDownloadTemplate === 'function') {
      try {
        setErrorMessage('');
        setJobMessage('');
        setStep('DOWNLOADING_TEMPLATE');
        setProgressValue(0);
        const saved = await onDownloadTemplate();
        if (!isSessionActive(session)) return;
        if (saved === false) { setStep(selectedFile ? 'READY' : 'IDLE'); return; }
        setProgressValue(100);
        setStep(selectedFile ? 'READY' : 'IDLE');
        notify(t('TEMPLATE_DL_SUCCESS', 'Đã tải file mẫu Excel.'), 'success', 1800);
      } catch (error: unknown) {
        if (!isSessionActive(session)) return;
        const message = getApiErrorMessage(error, t('TEMPLATE_DL_ERROR', 'Không tải được file mẫu. Vui lòng kiểm tra API hoặc quyền truy cập.'));
        setStep('ERROR');
        setErrorMessage(message);
        notify(message, 'error', 2500);
      }
      return;
    }

    if (!moduleCd) {
      return;
    }

    try {
      setErrorMessage('');
      setJobMessage('');
      setStep('DOWNLOADING_TEMPLATE');
      setProgressValue(0);

      const saved = await downloadFile({ fileName: resolvedTemplateFileName, load: (signal, progress) => downloadTemplateFromUrl(
        templateUrl,
        moduleCd,
        params,
        headers,
        (event) => {
          progress({ loaded: event.loaded, total: event.total });
          if (!isSessionActive(session)) return;
          setProgressValue(getProgressPercent(event as AxiosProgressEvent));
        },
        templateKeyName,
        signal,
      ) });

      if (!isSessionActive(session)) return;
      if (!saved) { setStep(selectedFile ? 'READY' : 'IDLE'); return; }
      setProgressValue(100);
      setStep(selectedFile ? 'READY' : 'IDLE');
      notify(t('TEMPLATE_DL_SUCCESS', 'Đã tải file mẫu Excel.'), 'success', 1800);
    } catch (error: unknown) {
      if (!isSessionActive(session)) return;
      const message = getApiErrorMessage(error, t('TEMPLATE_DL_ERROR', 'Không tải được file mẫu. Vui lòng kiểm tra API hoặc quyền truy cập.'));
      setStep('ERROR');
      setErrorMessage(message);
      notify(message, 'error', 2500);
    }
  }, [headers, isSessionActive, moduleCd, onDownloadTemplate, params, resolvedTemplateFileName, selectedFile, t, templateKeyName, templateUrl]);

  const readExcelSheetNamesFromBuffer = useCallback((buffer: ArrayBuffer): string[] => {
    const workbook = XLSX.read(buffer, {
      type: 'array',
      bookSheets: true,
    });

    return workbook.SheetNames ?? [];
  }, []);

  const resetDragOver = useCallback(() => {
    dragDepthRef.current = 0;
    setIsDragOver(false);
  }, []);

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (isBusy) return;
    dragDepthRef.current += 1;
    if (Array.from(event.dataTransfer.types).includes('Files')) {
      setIsDragOver(true);
    }
  }, [isBusy]);

  const handleDragLeave = useCallback(() => {
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleFileSelected = useCallback(async (e: FileUploaderTypes.ValueChangedEvent) => {
    resetDragOver();
    const file = e.value?.[0] ?? null;
    setResult(null);
    setErrorMessage('');
    setJobMessage('');
    setProgressValue(0);
    setProcessedRows(0);
    setTotalRows(0);
    setCurrentJobId('');
    setSheetNames([]);
    setSelectedSheetName('');

    if (!file) {
      setSelectedFile(null);
      setStep('IDLE');
      return;
    }

    const lowerFileName = file.name.toLowerCase();
    const isExcel = lowerFileName.endsWith('.xlsx') || lowerFileName.endsWith('.xls');

    if (!isExcel) {
      clearFileUploader();
      setFileUploaderKey((prev) => prev + 1);
      setSelectedFile(null);
      setStep('ERROR');
      setErrorMessage(t('FILE_FORMAT_ERROR', 'Chỉ cho phép import file Excel .xlsx hoặc .xls.'));
      notify(t('FILE_FORMAT_WARNING', 'File không đúng định dạng Excel.'), 'warning', 2500);
      return;
    }

    if (file.size > maxFileSizeBytes) {
      clearFileUploader();
      setFileUploaderKey((prev) => prev + 1);
      setSelectedFile(null);
      setStep('ERROR');
      setErrorMessage(format('FILE_SIZE_LIMIT', 'Dung lượng file không được vượt quá {0}MB.', String(maxFileSizeMb)));
      notify(format('FILE_SIZE_EXCEEDED', 'File vượt quá {0}MB.', String(maxFileSizeMb)), 'warning', 2500);
      return;
    }

    try {
      // Snapshot ngay lúc chọn: Chrome báo ERR_UPLOAD_FILE_CHANGED nếu file trên đĩa
      // bị sửa/lưu lại (Excel, OneDrive, antivirus...) trước khi POST multipart.
      const buffer = await file.arrayBuffer();
      const snapshot = new File([buffer], file.name, {
        type: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        lastModified: Date.now(),
      });

      const sheets = showSheetSelector ? readExcelSheetNamesFromBuffer(buffer) : [file.name];

      if (showSheetSelector && !sheets.length) {
        throw new Error(t('NO_SHEET_FOUND', 'File Excel không có sheet nào.'));
      }

      setSheetNames(sheets);
      setSelectedSheetNameSafe(showSheetSelector ? sheets[0] : '');
      setSelectedFile(snapshot);
      setStep('READY');
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, t('READ_SHEET_LIST_ERROR', 'Không đọc được danh sách sheet trong file Excel.'));
      clearFileUploader();
      setFileUploaderKey((prev) => prev + 1);
      setSheetNames([]);
      setSelectedSheetName('');
      setSelectedFile(null);
      setStep('ERROR');
      setErrorMessage(message);
      notify(message, 'error', 2500);
    }
  }, [clearFileUploader, format, maxFileSizeBytes, maxFileSizeMb, readExcelSheetNamesFromBuffer, resetDragOver, setSelectedSheetNameSafe, showSheetSelector, t]);

  const applyFinalResult = useCallback((importResult: ExcelImportResponse, session: number) => {
    if (!isSessionActive(session)) {
      return;
    }

    setResult(importResult);
    setProgressValue(100);
    setProcessedRows(importResult.totalRows);
    setTotalRows(importResult.totalRows);
    setStep(importResult.success ? 'DONE' : 'ERROR');
    clearFileKeepResult();

    if (importResult.success) {
      notify(importResult.message || t('IMPORT_SUCCESS', 'Import Excel thành công.'), 'success', 2500);
      onImported?.(importResult);
      if (closeAfterSuccess) {
        resetState();
        onClose();
      }
      return;
    }

    setErrorMessage(importResult.message || t('IMPORT_HAS_ERRORS', 'File có dữ liệu lỗi. Vui lòng kiểm tra danh sách kết quả bên dưới.'));
    notify(importResult.message || t('IMPORT_FAILED', 'Import Excel không thành công.'), 'error', 3000);
  }, [clearFileKeepResult, closeAfterSuccess, isSessionActive, onClose, onImported, resetState, t]);

  const pollImportProgress = useCallback(async (jobId: string, session: number) => {
    isPollingRef.current = true;

    while (isPollingRef.current && isSessionActive(session)) {
      const progress: ExcelImportProgressResult = await queryClient.fetchQuery({
        queryKey: queryKeys.jobs.progress(`excel-import:${progressUrl}`, jobId),
        queryFn: () => getExcelImportJobProgress(progressUrl, jobId, headers),
        staleTime: 0,
      });

      if (!isPollingRef.current || !isSessionActive(session)) {
        return;
      }

      setCurrentJobId(progress.jobId);
      setProgressValue(Math.max(0, Math.min(100, progress.percent ?? 0)));
      setProcessedRows(progress.processedRows ?? 0);
      setTotalRows(progress.totalRows ?? 0);
      setJobMessage(progress.message || t('PROGRESS_PROCESSING', 'Server đang xử lý dữ liệu import...'));

      if (isBackgroundJobFinished(progress.status)) {
        isPollingRef.current = false;

        if (progress.result) {
          applyFinalResult(progress.result, session);
          return;
        }

        const fallbackResult: ExcelImportResponse = {
          success: progress.status === 'DONE',
          totalRows: progress.totalRows ?? 0,
          successRows: progress.status === 'DONE' ? progress.processedRows ?? 0 : 0,
          warningRows: 0,
          errorRows: progress.status === 'ERROR' ? 1 : 0,
          message: progress.message || (
            progress.status === 'DONE' ?
              progress.totalRows === 0
                ? t('IMPORT_COMPLETE_EMPTY', 'Import Excel hoàn tất. File không có dữ liệu nào để import.')
                : t('IMPORT_COMPLETE', 'Import Excel hoàn tất.')
              : t('IMPORT_FAILED', 'Import Excel không thành công.')),
          rows: progress.status === 'ERROR'
            ? [{ rowNo: 0, status: 'ERROR', message: progress.message || t('IMPORT_FAILED', 'Import Excel không thành công.') }]
            : [],
        };

        applyFinalResult(fallbackResult, session);
        return;
      }

      await waitAsync(pollIntervalMs);
    }
  }, [applyFinalResult, headers, isSessionActive, pollIntervalMs, progressUrl, queryClient, t]);

  const handleImportByJobQueue = useCallback(async (file: File, session: number) => {
    setStep('UPLOADING');
    setProgressValue(0);
    setProcessedRows(0);
    setTotalRows(0);
    setJobMessage(t('UPLOAD_IN_PROGRESS', 'Đang upload file Excel...'));

    const importParams = {
      ...(params ?? {}),
      sheetName: selectedSheetNameRef.current || selectedSheetName,
    };

    const startResult = await startExcelImportJobByScreen({
      startImportUrl,
      fileFieldName,
      file,
      moduleCd,
      params: importParams,
      headers,
      onUploadProgress: (event) => {
        if (!isSessionActive(session)) return;
        const percent = getProgressPercent(event);
        setProgressValue(Math.min(10, Math.round(percent * 0.1)));
      },
    });

    if (!isSessionActive(session)) {
      return;
    }

    if (!startResult.jobId) {
      throw new Error(startResult.message || t('JOB_ID_MISSING', 'Không nhận được jobId từ server.'));
    }

    setCurrentJobId(startResult.jobId);
    setStep('IMPORTING');
    setJobMessage(startResult.message || t('JOB_CREATED', 'Đã tạo job import. Đang chờ server xử lý...'));
    setProgressValue((prev) => Math.max(prev, 10));
    onJobStarted?.(startResult.jobId);

    await pollImportProgress(startResult.jobId, session);
  }, [fileFieldName, headers, isSessionActive, onJobStarted, params, pollImportProgress, moduleCd, startImportUrl, selectedSheetName, t]);

  const handleImportByClient = useCallback(async (file: File, session: number) => {
    if (!onImportFile) {
      return;
    }

    setStep('IMPORTING');
    setProgressValue(20);
    setJobMessage(
      isClientImport
        ? t('CLIENT_STATUS_IMPORTING', 'Đang đọc file Excel và thêm dòng vào lưới...')
        : t('PROGRESS_PROCESSING', 'Server đang xử lý dữ liệu import...'),
    );

    const importResult = await onImportFile(file, {
      sheetName: selectedSheetNameRef.current || selectedSheetName,
    });

    if (!isSessionActive(session)) return;
    applyFinalResult(importResult, session);
  }, [applyFinalResult, isClientImport, isSessionActive, onImportFile, selectedSheetName, t]);

  const handleImport = useCallback(async () => {
    if (!selectedFile) {
      notify(t('SELECT_FILE_REQUIRED', 'Vui lòng chọn file Excel cần import.'), 'warning', 2000);
      return;
    }

    const session = ++importSessionRef.current;

    try {
      isPollingRef.current = false;
      setErrorMessage('');
      setResult(null);

      if (useClientImport) {
        await handleImportByClient(selectedFile, session);
        return;
      }

      if (!moduleCd) {
        throw new Error(t('MODULE_CD_REQUIRED', 'moduleCd is required to import Excel.'));
      }

      await handleImportByJobQueue(selectedFile, session);
  
    } catch (error: unknown) {
      isPollingRef.current = false;
      if (!isSessionActive(session)) {
        return;
      }
      const apiMessage = getApiErrorMessage(error, t('IMPORT_ERROR', 'Có lỗi xảy ra trong quá trình import Excel.'));
      setStep('ERROR');
      setProgressValue(0);
      setJobMessage('');
      setErrorMessage(apiMessage);
      clearFileKeepResult();
      notify(apiMessage, 'error', 3000);
    }
  }, [clearFileKeepResult, handleImportByClient, handleImportByJobQueue, isSessionActive, moduleCd, selectedFile, t, useClientImport]);

  const hideExcelPopup = useCallback(() => {
    void popupRef.current?.hide();
  }, []);

  usePopupEscapeLayer(visible, hideExcelPopup, () => popupWrapperRef.current);

  const bindExcelPopup = useCallback((component: dxPopup) => {
    popupRef.current = component;
    const wrapper = overlayWrapperFromPopupContent(component.content());
    popupWrapperRef.current = wrapper;
    disableBuiltInPopupEscape(component);
    if (visiblePopupCount() > 1) {
      raiseOverlayAboveSiblings(wrapper);
    }
  }, []);

  const resultRows = useMemo<ResultRowWithKey[]>(() => {
    return (result?.rows ?? []).map((row, index) => ({
      ...row,
      __key: `${row.rowNo}-${index}`,
    }));
  }, [result]);

  return (
    <Popup
      visible={visible}
      title={t("LOAD_DATA_FROM_EXCEL", "Import Excel")}
      width="min(980px, 96vw)"
      height="min(720px, 92vh)"
      showCloseButton
      dragEnabled
      hideOnOutsideClick={false}
      onShowing={(event) => {
        bindExcelPopup(event.component);
      }}
      onShown={(event) => {
        bindExcelPopup(event.component);
      }}
      onHiding={handleClose}
      wrapperAttr={{ class: 'base-excel-import-popup' }}
    >
      <LoadPanel visible={isBusy} message={statusText} shading={false} position={{ of: '.base-excel-import-popup' }} />

      <ScrollView width="100%" height="100%">
        <div className="excel-import-container">
              <div className="excel-import-hero">
            <div>
              <div className="excel-import-title">{popupTitle}</div>
              <div className="excel-import-desc">
                {description || (
                  isClientImport
                    ? t('CLIENT_IMPORT_MAIN_DESC', 'Chọn file Excel có các dòng hàng hóa. Dữ liệu được thêm trực tiếp vào lưới trên màn hình, chưa lưu vào hệ thống.')
                    : t('IMPORT_MAIN_DESC', 'Tải file mẫu chuẩn, nhập dữ liệu theo đúng cột quy định, sau đó upload để hệ thống kiểm tra và import.')
                )}
              </div>
            </div>

            {canDownloadTemplate ? (
              <Button
                text={t('DOWNLOAD_TEMPLATE', 'Tải file mẫu')}
                icon="xlsxfile"
                type="default"
                stylingMode="contained"
                disabled={isBusy}
                onClick={handleDownloadTemplate}
              />
            ) : null}
          </div>

          {!isClientImport ? (
            <div className="excel-import-steps">
              {canDownloadTemplate ? (
                <div className="excel-import-step active">
                  <div className="step-no">1</div>
                  <div>
                    <b>{t('STEP_DOWNLOAD', 'Tải mẫu')}</b>
                    <span>{t('STEP_DOWNLOAD_DESC', 'Lấy đúng biểu mẫu của màn hình hiện tại')}</span>
                  </div>
                </div>
              ) : null}
              <div className={`excel-import-step ${selectedFile ? 'active' : ''}`}>
                <div className="step-no">{canDownloadTemplate ? 2 : 1}</div>
                <div>
                  <b>{t('STEP_SELECT', 'Chọn file')}</b>
                  <span>{t('STEP_SELECT_DESC', 'Hỗ trợ .xlsx, .xls')}</span>
                </div>
              </div>
              <div className={`excel-import-step ${result || currentJobId ? 'active' : ''}`}>
                <div className="step-no">{canDownloadTemplate ? 3 : 2}</div>
                <div>
                  <b>{t('STEP_IMPORT', 'Import')}</b>
                  <span>{t('STEP_IMPORT_DESC', 'Kiểm tra lỗi và ghi dữ liệu vào hệ thống')}</span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="excel-import-card">
            <div className="excel-import-card-header">
              <div>
                <div className="card-title">{t('SELECT_FILE_TITLE', 'Chọn file Excel cần import')}</div>
                <div className="card-subtitle">
                  {isClientImport
                    ? canDownloadTemplate
                      ? format('CLIENT_FILE_UPLOAD_WITH_TEMPLATE_SUBTITLE', 'Dung lượng tối đa {0}MB. Tải file mẫu chi tiết hàng hóa ở trên nếu cần.', String(maxFileSizeMb))
                      : format('CLIENT_FILE_UPLOAD_SUBTITLE', 'Dung lượng tối đa {0}MB. Hỗ trợ .xlsx, .xls.', String(maxFileSizeMb))
                    : format('FILE_UPLOAD_SUBTITLE', 'Dung lượng tối đa {0}MB. Nên dùng file mẫu tải từ hệ thống.', String(maxFileSizeMb))}
                </div>
              </div>
            </div>

            <div
              ref={setDropHost}
              className={`excel-import-drop-host${isDragOver ? ' is-dragover' : ''}${isBusy ? ' is-disabled' : ''}`}
              role="button"
              tabIndex={isBusy ? -1 : 0}
              onDragEnter={handleDragEnter}
              onDragOver={(event) => {
                if (isBusy) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
              }}
              onDragLeave={handleDragLeave}
              onDrop={resetDragOver}
            >
              <div className="excel-import-dropzone">
                <span className="excel-import-dropzone-btn">{t('SELECT_FILE_BUTTON', 'Chọn file Excel')}</span>
                <span className="excel-import-dropzone-hint">
                  {isDragOver
                    ? t('FILE_DROP_HERE', 'Thả file vào đây')
                    : t('FILE_UPLOAD_HINT', 'hoặc kéo thả file vào đây')}
                </span>
              </div>
            </div>
            <FileUploader
              ref={fileUploaderRef}
              key={fileUploaderKey}
              elementAttr={{ class: 'excel-import-file-uploader' }}
              dialogTrigger={dropHost ?? undefined}
              dropZone={dropHost ?? undefined}
              selectButtonText={t('SELECT_FILE_BUTTON', 'Chọn file Excel')}
              labelText=""
              accept=".xlsx,.xls"
              uploadMode="useButtons"
              multiple={false}
              showFileList={false}
              disabled={isBusy}
              onDropZoneEnter={() => setIsDragOver(true)}
              onDropZoneLeave={resetDragOver}
              onValueChanged={handleFileSelected}
              inputAttr={{ 'aria-label': t('ARIA_IMPORT_FILE', 'Excel import file') }}
            />

            {selectedFile && (
              <div className="selected-file-box">
                <div>
                  <b>{selectedFile.name}</b>
                  <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                 {showSheetSelector ? (
                  <div className="selected-sheet-box">
                    <div className="sheet-select-label">{t('SHEET_LABEL', 'Sheet cần import')}</div>
                    <SelectBox
                      dataSource={sheetNames}
                      value={selectedSheetName}
                      searchEnabled
                      disabled={isBusy}
                      placeholder={t('SELECT_SHEET_PLACEHOLDER', 'Chọn sheet')}
                      noDataText={t('NO_SHEET', 'Không có sheet')}
                      width="100%"
                      onValueChanged={(e) => setSelectedSheetNameSafe(String(e.value ?? ''))}
                      inputAttr={{ 'aria-label': t('ARIA_SHEET_NAME', 'Excel sheet name') }}
                    />
                  </div>
                 ) : null}
                <span className="file-status">{t('FILE_STATUS_READY', 'Sẵn sàng')}</span>
              </div>
            )}

          </div>

          <div className="excel-import-card">
            <div className="excel-import-card-header compact">
              <div>
                <div className="card-title">{t('PROGRESS_TITLE', 'Tiến trình import')}</div>
                <div className="card-subtitle">{statusText}</div>
              </div>
              <Button
                text={isClientImport ? t('CLIENT_IMPORT_BUTTON', 'Thêm vào lưới') : t('IMPORT_BUTTON', 'Thực hiện import')}
                icon="upload"
                type="success"
                stylingMode="contained"
                disabled={!canImport}
                onClick={handleImport}
              />
            </div>

            <ProgressBar
              min={0}
              max={100}
              value={progressValue}
              showStatus
              statusFormat={(_ratio: number, value: number) => `${Math.round(value)}%`}
            />

            {(totalRows > 0 || processedRows > 0) && (
              <div className="excel-import-progress-detail">
                {t('PROGRESS_DETAIL_PREFIX', 'Đã xử lý')} <b>{processedRows}</b>/<b>{totalRows}</b> {t('PROGRESS_DETAIL_SUFFIX', 'dòng')}
              </div>
            )}

            {errorMessage && <div className="excel-import-error">{errorMessage}</div>}
          </div>

          {result && result.errorRows > 0 && (
            <div className="excel-import-card">
              <DataGrid
                dataSource={resultRows}
                keyExpr="__key"
                height={260}
                showBorders
                columnAutoWidth
                rowAlternationEnabled
                noDataText={t('ERROR_GRID_EMPTY', 'Không có lỗi chi tiết.')}
              >
                <Scrolling mode="virtual" />
                <Paging enabled={false} />
                <Column dataField="rowNo" caption={t('COL_ROW', 'Dòng')} width={80} alignment="center" />                
                <Column dataField="message" caption={t('COL_MESSAGE', 'Nội dung xử lý')} minWidth={320} />
              </DataGrid>
            </div>
          )}
        </div>
      </ScrollView>
    </Popup>
  );
}

