import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { loadMessages, locale } from 'devextreme/localization';
import { getCurrentLang, setCurrentLang } from '@/utils/language';
import { getLanguage } from '@/api/LanguagesApi';
import { isAuthenticated } from '@/lib/login';


const labelsPromiseCache: Record<string, Promise<Record<string, string>>> = {};


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

export function initMessagesDevex() {
  try {
    loadMessages(messages);
     
      locale(getCurrentLang());
  } catch (err) {
    // ignore cache errors
  }
}


export const LanguageContext = createContext({} as {
  lang: string;
  setLang: (l: string) => void;
  translate: (key: string, fallback?: string) => string;
  labelsLoading: boolean;

  refreshLabels: (lang?: string) => Promise<void>;
});

export const LanguageProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [lang, setLangState] = useState<string>(() => getCurrentLang());
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [labelsLoading, setLabelsLoading] = useState<boolean>(false);


  useEffect(() => {
    let mounted = true;

    
    if (!isAuthenticated()) {
      setLabels({});
      setLabelsLoading(false);
      return () => {
        mounted = false;
      };
    }

    setLabelsLoading(true);
    let p = labelsPromiseCache[lang];
    if (!p) {
      p = getLanguage(lang);
      labelsPromiseCache[lang] = p;
    }

    p.then((data) => {
      if (mounted) setLabels(data || {});
    })
      .catch(() => {
        if (mounted) setLabels({});
      })
      .finally(() => {
        if (mounted) setLabelsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [lang]);

  const setLang = useCallback((l: string) => {
    setCurrentLang(l);
    setLangState(l);
    try {
      loadMessages(messages);
      locale(l);
    } catch (err) {
      // ignore
    }
  }, []);

  const translate = useCallback((key: string, fallback?: string) => {

  if (labels && key in labels) return labels[key];
  return fallback ?? key;
  }, [labels, lang]);

  const refreshLabels = useCallback(async (forLang?: string) => {
    if (!isAuthenticated()) {
     
      setLabels({});
      return;
    }

    const l = forLang ?? lang;

    delete labelsPromiseCache[l];
    try {
      const data = await getLanguage(l);
      setLabels(data || {});
    } catch (err) {
      setLabels({});
    }
  }, [lang]);

  useEffect(() => {
    try {
      loadMessages(messages);
      locale(lang);
    } catch (err) {}
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, translate, labelsLoading, refreshLabels }), [lang, setLang, translate, labelsLoading, refreshLabels]);

  return React.createElement(LanguageContext.Provider, { value }, children);
};
