import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { loadMessages, locale } from 'devextreme/localization';
import {
  buildLanguageLabelIndex,
  getCurrentLang,
  getLocaleCode,
  normalizeMessageLanguageKey,
  resolveLanguageLabel,
  setCurrentLang,
} from '@/utils/language';
import {
  AUTH_SESSION_CHANGED_EVENT,
  canRestoreSession,
  isAuthenticated,
  type AuthSession,
} from '@/lib/login';
import { isPublicAppPath } from '@/lib/publicRoutes';
import { STALE_TIME } from '@/lib/query/queryKeys';
import { getLanguage } from '@/api/LanguagesApi';
import { clearGlobalStorageNamespace } from '@/lib/globalStorageCache';
import type { MessageLanguageKey } from '@/types/languages';
import { useLabelsQuery } from '@/hooks/queries/useLabelsQuery';
import { queryClient } from '@/lib/query/queryClient';
import { queryKeys } from '@/lib/query/queryKeys';

export const messages: Record<string, Record<string, string>> = {
  vi: {
    "dxDataGrid-editingSaveAllChanges": "Lưu",
    "dxDataGrid-editingCancelAllChanges": "Hủy",
    "dxDataGrid-editingSaveRowChanges": "Lưu",
    "dxDataGrid-editingCancelRowChanges": "Hủy",
    "dxPopup-ok": "Lưu",
    "dxPopup-cancel": "Hủy",
    "dxDataGrid-editingEditRow": "Sửa",
    "dxDataGrid-editingDeleteRow": "Xóa",
    "dxDataGrid-editingAddRow": "Thêm",
    "dxDataGrid-confirmDeleteMessage": "Bạn có chắc muốn xóa không?",
    "Yes": "Đồng ý",
    "No": "Hủy",
    "OK": "Đồng ý",
    "Cancel": "Hủy",
    "dxDataGrid-editingConfirmDeleteMessage": "Bạn có chắc muốn xóa không?",
    "dxDataGrid-filterPanelCreateFilter": "Tạo bộ lọc",
    "dxDataGrid-filterPanelClearFilter": "Xóa bộ lọc",
    "dxDataGrid-filterRowShowAllText": "Hiển thị tất cả",
    "dxDataGrid-filterRowResetOperationText": "Đặt lại",
    "dxDataGrid-filterBuilderPopupTitle": "Tạo bộ lọc"
  },
  en: {
    "dxDataGrid-editingSaveAllChanges": "Save",
    "dxDataGrid-editingCancelAllChanges": "Cancel",
    "dxDataGrid-editingSaveRowChanges": "Save",
    "dxDataGrid-editingCancelRowChanges": "Cancel",
    "dxPopup-ok": "Save",
    "dxPopup-cancel": "Cancel",
    "dxDataGrid-editingEditRow": "Edit",
    "dxDataGrid-editingDeleteRow": "Delete",
    "dxDataGrid-editingAddRow": "Add",
    "dxDataGrid-confirmDeleteMessage": "Are you sure you want to delete?",
    "Yes": "Yes",
    "No": "No",
    "OK": "OK",
    "Cancel": "Cancel",
    "dxDataGrid-editingConfirmDeleteMessage": "Are you sure you want to delete?",
    "dxDataGrid-filterPanelCreateFilter": "Create Filter",
    "dxDataGrid-filterPanelClearFilter": "Clear Filter",
    "dxDataGrid-filterRowShowAllText": "Show All",
    "dxDataGrid-filterRowResetOperationText": "Reset",
    "dxDataGrid-filterBuilderPopupTitle": "Create Filter"
  },
  zh: {
    "dxDataGrid-editingSaveAllChanges": "保存",
    "dxDataGrid-editingCancelAllChanges": "取消",
    "dxDataGrid-editingSaveRowChanges": "保存",
    "dxDataGrid-editingCancelRowChanges": "取消",
    "dxPopup-ok": "保存",
    "dxPopup-cancel": "取消",
    "dxDataGrid-editingEditRow": "编辑",
    "dxDataGrid-editingDeleteRow": "删除",
    "dxDataGrid-editingAddRow": "新增",
    "dxDataGrid-confirmDeleteMessage": "您确定要删除吗？",
    "Yes": "是",
    "No": "否",
    "OK": "确定",
    "Cancel": "取消",
    "dxDataGrid-editingConfirmDeleteMessage": "您确定要删除吗？",
    "dxDataGrid-filterPanelCreateFilter": "创建过滤器",
    "dxDataGrid-filterPanelClearFilter": "清除过滤器",
    "dxDataGrid-filterRowShowAllText": "显示所有",
    "dxDataGrid-filterRowResetOperationText": "重置",
    "dxDataGrid-filterBuilderPopupTitle": "创建过滤器"
  },
  ko: {
    "dxDataGrid-editingSaveAllChanges": "저장",
    "dxDataGrid-editingCancelAllChanges": "취소",
    "dxDataGrid-editingSaveRowChanges": "저장",
    "dxDataGrid-editingCancelRowChanges": "취소",
    "dxPopup-ok": "저장",
    "dxPopup-cancel": "취소",
    "dxDataGrid-editingEditRow": "수정",
    "dxDataGrid-editingDeleteRow": "삭제",
    "dxDataGrid-editingAddRow": "추가",
    "dxDataGrid-confirmDeleteMessage": "정말로 삭제하시겠습니까?",
    "Yes": "예",
    "No": "아니오",
    "OK": "확인",
    "Cancel": "취소",
    "dxDataGrid-editingConfirmDeleteMessage": "정말로 삭제하시겠습니까?",
    "dxDataGrid-filterPanelCreateFilter": "필터 만들기",
    "dxDataGrid-filterPanelClearFilter": "필터 지우기",
    "dxDataGrid-filterRowShowAllText": "모두 표시",
    "dxDataGrid-filterRowResetOperationText": "재설정",
    "dxDataGrid-filterBuilderPopupTitle": "필터 만들기"
  },
  ja: {
    "dxDataGrid-editingSaveAllChanges": "保存",
    "dxDataGrid-editingCancelAllChanges": "キャンセル",
    "dxDataGrid-editingSaveRowChanges": "保存",
    "dxDataGrid-editingCancelRowChanges": "キャンセル",
    "dxPopup-ok": "保存",
    "dxPopup-cancel": "キャンセル",
    "dxDataGrid-editingEditRow": "編集",
    "dxDataGrid-editingDeleteRow": "削除",
    "dxDataGrid-editingAddRow": "追加",
    "dxDataGrid-confirmDeleteMessage": "削除してもよろしいですか？",
    "Yes": "はい",
    "No": "いいえ",
    "OK": "はい",
    "Cancel": "キャンセル",
    "dxDataGrid-editingConfirmDeleteMessage": "削除してもよろしいですか？",
    "dxDataGrid-filterPanelCreateFilter": "フィルター作成",
    "dxDataGrid-filterPanelClearFilter": "フィルタークリア",
    "dxDataGrid-filterRowShowAllText": "すべて表示",
    "dxDataGrid-filterRowResetOperationText": "リセット",
    "dxDataGrid-filterBuilderPopupTitle": "フィルター作成"
  }
};

export function initMessagesDevex(lang = getCurrentLang()) {
  loadMessages(messages);
  locale(getLocaleCode(lang));
}

export function clearLanguageCache(): void {
  clearGlobalStorageNamespace('language-labels');
  queryClient.removeQueries({
    queryKey: queryKeys.labels.all,
  });
}

export const LanguageContext = createContext({} as {
  lang: MessageLanguageKey;
  setLang: (l: string) => void;
  translate: (key: string, fallback?: string) => string;
  labelsLoading: boolean;
  labelsReady: boolean;

  refreshLabels: (lang?: string) => Promise<void>;
});

function shouldEnableLabelsQuery(): boolean {
  if (isPublicAppPath()) {
    return false;
  }

  return canRestoreSession() || isAuthenticated();
}

export const LanguageProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [lang, setLangState] = useState<MessageLanguageKey>(() => {
    const initialLang = getCurrentLang();
    initMessagesDevex(initialLang);
    return initialLang;
  });
  const [labelsQueryEnabled, setLabelsQueryEnabled] = useState(shouldEnableLabelsQuery);
  const { data: labels = {}, isLoading, isFetching } = useLabelsQuery(lang, labelsQueryEnabled);
  const labelsLoading = labelsQueryEnabled && (isLoading || isFetching);
  const labelsReady = labelsQueryEnabled && Object.keys(labels).length > 0;
  const emptyRecoverAttemptsRef = React.useRef(0);

  const setLang = useCallback((l: string) => {
    const normalizedLang = normalizeMessageLanguageKey(l);
    setCurrentLang(normalizedLang);
    // Set the locale before React creates widgets for the new language.
    initMessagesDevex(normalizedLang);
    setLangState(normalizedLang);
  }, []);

  const labelsByLookupKey = useMemo(() => buildLanguageLabelIndex(labels), [labels]);

  const translate = useCallback((key: string, fallback?: string) => {
    return resolveLanguageLabel(labels, key, labelsByLookupKey) ?? fallback ?? key;
  }, [labels, labelsByLookupKey]);

  const fetchLabels = useCallback(async (forLang?: string) => {
    if (!shouldEnableLabelsQuery()) {
      clearLanguageCache();
      return;
    }

    const targetLang = normalizeMessageLanguageKey(forLang ?? lang);
    clearGlobalStorageNamespace("language-labels");
    await queryClient.fetchQuery({
      queryKey: queryKeys.labels.byLang(targetLang),
      queryFn: () => getLanguage(targetLang),
      staleTime: STALE_TIME.LABELS,
    });
  }, [lang]);

  const refreshLabels = fetchLabels;

  useEffect(() => {
    const handleSessionChanged = async (event: Event) => {
      const session = (event as CustomEvent<AuthSession | null>).detail;
      if (!session?.isAuthenticated) {
        clearLanguageCache();
        setLabelsQueryEnabled(shouldEnableLabelsQuery());
        emptyRecoverAttemptsRef.current = 0;
        return;
      }

      const sessionLang = normalizeMessageLanguageKey(session.lang ?? getCurrentLang());
      setLabelsQueryEnabled(true);
      setLang(sessionLang);
      // Token refresh re-fires this event. Only reload when labels were wiped
      // (logout / queryClient.clear / idle session drop) so UI captions recover.
      const cached = queryClient.getQueryData<Record<string, string>>(queryKeys.labels.byLang(sessionLang));
      if (!cached || Object.keys(cached).length === 0) {
        await fetchLabels(sessionLang);
      }
    };

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChanged as EventListener);
    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChanged as EventListener);
    };
  }, [fetchLabels, setLang]);

  useEffect(() => {
    if (!labelsQueryEnabled || isLoading || isFetching) {
      return;
    }

    if (Object.keys(labels).length > 0) {
      emptyRecoverAttemptsRef.current = 0;
      return;
    }

    if (!shouldEnableLabelsQuery()) {
      return;
    }

    if (emptyRecoverAttemptsRef.current >= 3) {
      return;
    }

    emptyRecoverAttemptsRef.current += 1;
    void fetchLabels(lang);
  }, [fetchLabels, isFetching, isLoading, labels, labelsQueryEnabled, lang]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      if (!labelsQueryEnabled || !shouldEnableLabelsQuery()) {
        return;
      }

      if (Object.keys(labels).length === 0) {
        void fetchLabels(lang);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [fetchLabels, labels, labelsQueryEnabled, lang]);

  const value = useMemo(() => ({ lang, setLang, translate, labelsLoading, labelsReady, refreshLabels }), [lang, setLang, translate, labelsLoading, labelsReady, refreshLabels]);

  return React.createElement(LanguageContext.Provider, { value }, children);
};
