import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import SelectBox from "devextreme-react/select-box";
import { confirm } from "devextreme/ui/dialog";
import { useLocation, useNavigate } from "react-router-dom";
import type { ValueChangedEvent } from "devextreme/ui/select_box";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Eraser,
  Globe,
  HelpCircle,
  Landmark,
  Layers,
  LogOut,
  Menu,
  Minus,
  Plus,
  Settings,
  Type,
  User,
} from "lucide-react";

import { getCompanyInfo } from "@/api/companyInfoApi";
import {
  clearNotificationSummaryCache,
  getNotificationSummary,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  syncNotifications,
} from "@/api/notificationApi";
import { useFontScale } from "@/components/font-scale-provider";
import { useMenuLayout } from "@/components/menu-layout-provider";
import { getCompanyLangState, isUiLanguageEnabled, toUiLanguageCode, useCompanyLangRevision } from "@/lib/companyLang";
import { LanguageContext } from "@/lib/i18nLoader";
import { useFinanceTierState } from "@/hooks/useFinanceTierState";
import "./FinanceModuleTabs.css";
import {
  formatNotificationTime,
  isNotificationUnread,
  mapNotificationDisplayType,
} from "@/lib/notificationUtils";
import {
  AUTH_SESSION_CHANGED_EVENT,
  buildAppPath,
  getCurrentCompanyCd,
  getCurrentSession,
  updateCurrentSession,
  type AuthCompany,
  type AuthSession,
} from "@/lib/login";
import { clearFrontendCaches } from "@/lib/cacheManager";
import { SHOW_DASHBOARD, SHOW_NOTIFICATIONS, SHOW_USER_GUIDE } from "@/lib/featureVisibility";
import { SHORTCUT_KEYS } from "@/lib/shortcuts/shortcutKeys";
import { dispatchShortcutCombo } from "@/lib/shortcuts/shortcutUtils";
import { useSysCodes } from "@/lib/sysCodeContext";
import { useMyProfileQuery } from "@/hooks/queries/adminQueries";
import { useMyAvatarThumbSrc } from "@/hooks/useMyAvatarThumbSrc";
import { useSysGridColumnSettings } from "@/lib/sysGridColumnSettingContext";
import type { NotificationDisplayType, SysNotificationItem } from "@/types/notification";
import type { MenuTreeNode } from "@/types/menu";
import { languages, type Language } from "@/utils/language";
import { resolveMenuCaption } from "@/utils/resolveConfigCaption";

interface HeaderProps {
  currentMenuItem?: MenuTreeNode | null;
  systemMenuNode?: MenuTreeNode | null;
  onLogout: () => void;
}

type CompanyOption = {
  COMPANY_CD: string;
  COMPANY_NM: string;
  TAX_CD: string;
  displayName: string;
};

type CompanyDetailsLookup = Record<string, { taxCode: string; name: string }>;

function buildCompanyOption(company: AuthCompany): CompanyOption {
  const companyCd = normalizeDisplayText(company.COMPANY_CD);
  const companyName = normalizeDisplayText(company.COMPANY_NM);

  return {
    COMPANY_CD: companyCd,
    COMPANY_NM: companyName,
    TAX_CD: companyCd,
    displayName: companyName ? `${companyCd} - ${companyName}` : companyCd,
  };
}

function stripCompanyPathname(pathname: string): string {
  const match = /^\/app\/[^/]+/i.exec(pathname);
  if (!match) {
    return pathname || "/";
  }

  return pathname.slice(match[0].length) || "/";
}

function getNotificationIcon(type: NotificationDisplayType): JSX.Element {
  switch (type) {
    case "error":
      return <AlertTriangle size={16} className="am-icon-notification-error" />;
    case "warning":
      return <Clock size={16} className="am-icon-notification-warning" />;
    case "success":
      return <CheckCircle size={16} className="am-icon-notification-success" />;
    default:
      return <Bell size={16} className="am-icon-notification-info" />;
  }
}

function normalizeDisplayText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function buildUserInitials(displayName: string, fallback = ""): string {
  const source = normalizeDisplayText(displayName) || normalizeDisplayText(fallback) || "U";
  const tokens = source.split(/\s+/).filter(Boolean);

  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }

  return `${tokens[0][0] ?? ""}${tokens[tokens.length - 1][0] ?? ""}`.toUpperCase();
}

function buildTooltipText(...parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => normalizeDisplayText(part))
    .filter(Boolean)
    .join("\n");
}

export default function Header({ onLogout, currentMenuItem, systemMenuNode }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentCompanyCd = getCurrentCompanyCd();
  const { clearGridColumnSettings, refreshGridColumnSettings } = useSysGridColumnSettings();
  const { clearSysCodes, refreshSysCodes } = useSysCodes();
  const { lang, setLang, refreshLabels, translate } = useContext(LanguageContext) as {
    lang: string;
    refreshLabels?: (lang?: string) => Promise<void>;
    setLang: (langCode: string) => void;
    translate: (key: string, fallback?: string) => string;
  };
  const {
    canDecreaseFont,
    canIncreaseFont,
    decreaseFontSize,
    fontSizePx,
    increaseFontSize,
  } = useFontScale();
  const {
    menuLayout,
    setMenuLayout,
    showWorkspaceBar,
    setShowWorkspaceBar,
    showHeaderMenuBar,
    setShowHeaderMenuBar,
  } = useMenuLayout();
  const [session, setSession] = useState<AuthSession | null>(() => getCurrentSession());
  const [companyTaxCode, setCompanyTaxCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyDetailsLookup, setCompanyDetailsLookup] = useState<CompanyDetailsLookup>({});
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [isHelpDropdownOpen, setIsHelpDropdownOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<SysNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const { data: myProfile } = useMyProfileQuery();
  const headerAvatarSrc = useMyAvatarThumbSrc(
    typeof myProfile?.AVATAR_URL === "string" ? myProfile.AVATAR_URL : "",
  );

  const t = (key: string, fallback?: string) => (translate ? translate(key, fallback) : fallback ?? key);
  const getLanguageLabel = (language: Language) =>
    t(`language.${language.code}`, language.name);

  const companyLangRevision = useCompanyLangRevision();
  const visibleLanguages = useMemo(
    () => languages.filter((language) => isUiLanguageEnabled(language.code)),
    [companyLangRevision],
  );
  const selectedLanguage = useMemo(
    () => visibleLanguages.find((language) => language.code === lang) ?? languages.find((language) => language.code === lang) ?? languages[0],
    [lang, visibleLanguages],
  );

  useEffect(() => {
    if (visibleLanguages.some((language) => language.code === lang)) {
      return;
    }

    const fallbackCode = toUiLanguageCode(getCompanyLangState().defaultLang);
    const fallback = visibleLanguages.find((language) => language.code === fallbackCode) ?? visibleLanguages[0];
    if (!fallback) {
      return;
    }

    setLang(fallback.code);
    if (typeof refreshLabels === "function") {
      void refreshLabels(fallback.code);
    }
  }, [lang, refreshLabels, setLang, visibleLanguages]);
  const translatedSystemTitle = useMemo(
    () => (systemMenuNode ? resolveMenuCaption(systemMenuNode, t) : t("brand", "AMnote")),
    [systemMenuNode, t],
  );
  const translatedCurrentMenuTitle = useMemo(
    () => (
      currentMenuItem
        ? resolveMenuCaption(currentMenuItem, t)
        : (SHOW_DASHBOARD ? t("DASHBOARD", "Tổng quan") : t("brand", "AMnote"))
    ),
    [currentMenuItem, t],
  );
  const companyOptions = useMemo(
    () => (session?.companies ?? []).map(buildCompanyOption),
    [session?.companies],
  );
  const enrichedCompanyOptions = useMemo(
    () =>
      companyOptions.map((option) => {
        const details = companyDetailsLookup[option.COMPANY_CD.toUpperCase()];
        const taxCode = normalizeDisplayText(details?.taxCode) || option.COMPANY_CD;
        const name = normalizeDisplayText(details?.name) || option.COMPANY_NM || option.COMPANY_CD;

        return {
          ...option,
          COMPANY_NM: name,
          TAX_CD: taxCode,
          displayName: `${option.COMPANY_CD} · ${taxCode} · ${name}`,
        };
      }),
    [companyDetailsLookup, companyOptions],
  );
  const selectedCompanyCd = useMemo(
    () => normalizeDisplayText(currentCompanyCd) || normalizeDisplayText(session?.defaultCompanyCd),
    [currentCompanyCd, session?.defaultCompanyCd],
  );
  const selectedCompanyOption = useMemo(
    () =>
      companyOptions.find(
        (company) => company.COMPANY_CD.toUpperCase() === selectedCompanyCd.toUpperCase(),
      ),
    [companyOptions, selectedCompanyCd],
  );
  const displayMst = useMemo(
    () =>
      normalizeDisplayText(companyTaxCode) ||
      normalizeDisplayText(selectedCompanyOption?.COMPANY_CD) ||
      normalizeDisplayText(currentCompanyCd),
    [companyTaxCode, currentCompanyCd, selectedCompanyOption?.COMPANY_CD],
  );
  const displayUserId = useMemo(
    () => normalizeDisplayText(session?.userId),
    [session?.userId],
  );
  const companyDisplayName = useMemo(
    () =>
      normalizeDisplayText(companyName) ||
      normalizeDisplayText(selectedCompanyOption?.COMPANY_NM) ||
      normalizeDisplayText(currentCompanyCd) ||
      t("COMPANY", "Company"),
    [companyName, currentCompanyCd, selectedCompanyOption?.COMPANY_NM, t],
  );
  const userInitials = useMemo(
    () => buildUserInitials(displayUserId, session?.userId),
    [displayUserId, session?.userId],
  );
  const languageTooltip = useMemo(
    () => `${t("language", "Language")}: ${getLanguageLabel(selectedLanguage)}`,
    [selectedLanguage, t],
  );
  const helpTooltip = useMemo(
    () => buildTooltipText(t("helpSupport", "Help & Support"), t("shortcutHelp", "Shortcut help")),
    [t],
  );
  const userTooltip = useMemo(
    () => buildTooltipText(
      `${t("USER_ID", "ID")}: ${displayUserId}`,
      `${t("TAX_CD", "MST")}: ${displayMst}`,
      companyDisplayName,
    ),
    [companyDisplayName, displayMst, displayUserId, t],
  );
  const companySwitchTooltip = useMemo(
    () => `${t("switchCompany", "Switch company")}: ${displayMst}`,
    [displayMst, t],
  );
  const shouldShowPageBadge = useMemo(() => {
    const normalizedSystemTitle = normalizeDisplayText(translatedSystemTitle).toLocaleLowerCase();
    const normalizedCurrentMenuTitle = normalizeDisplayText(translatedCurrentMenuTitle).toLocaleLowerCase();

    return Boolean(normalizedCurrentMenuTitle) && normalizedCurrentMenuTitle !== normalizedSystemTitle;
  }, [translatedCurrentMenuTitle, translatedSystemTitle]);

  const headerSurfaceClass = "bg-white border-gray-200";
  const dropdownSurfaceClass = "bg-white border-gray-200 shadow-lg";
  const hoverSurfaceClass = "hover:bg-gray-100";
  const itemHoverClass = "hover:bg-gray-50";
  const titleTextClass = "text-gray-900";
  const bodyTextClass = "text-gray-700";
  const mutedTextClass = "text-gray-500";
  const iconTextClass = "text-gray-600";
  const headerActionButtonClass = `group rounded-lg p-2 transition-colors ${hoverSurfaceClass}`;
  const dividerClass = "border-gray-100";
  const selectedItemClass = "bg-blue-50 text-blue-700";
  const pageBadgeClass = "bg-red-50 text-red-700 border border-red-200";

  const financeTier = useFinanceTierState();
  const headerGroupTabs =
    menuLayout === "header" && financeTier.shouldMergeGroupTabs ? financeTier.topMenu?.children ?? [] : [];
  const showHeaderGroupTabs = headerGroupTabs.length > 0;

  useEffect(() => {
    const handleSessionChange = (event: Event) => {
      const nextSession = (event as CustomEvent<AuthSession | null>).detail ?? getCurrentSession();
      setSession(nextSession);
    };

    setSession(getCurrentSession());
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChange as EventListener);

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChange as EventListener);
    };
  }, []);

  useEffect(() => {
    const companies = session?.companies ?? [];
    if (companies.length === 0) {
      setCompanyDetailsLookup({});
      return;
    }

    let cancelled = false;

    void (async () => {
      const entries = await Promise.all(
        companies.map(async (company) => {
          const companyCd = normalizeDisplayText(company.COMPANY_CD);
          if (!companyCd) {
            return null;
          }

          try {
            const response = await getCompanyInfo(companyCd);
            return {
              key: companyCd.toUpperCase(),
              taxCode:
                normalizeDisplayText(response.data?.TAX_CD) ||
                normalizeDisplayText(response.data?.COMPANY_CD) ||
                companyCd,
              name:
                normalizeDisplayText(response.data?.COMPANY_NM) ||
                normalizeDisplayText(company.COMPANY_NM) ||
                companyCd,
            };
          } catch {
            return {
              key: companyCd.toUpperCase(),
              taxCode: companyCd,
              name: normalizeDisplayText(company.COMPANY_NM) || companyCd,
            };
          }
        }),
      );

      if (cancelled) {
        return;
      }

      const nextLookup: CompanyDetailsLookup = {};
      for (const entry of entries) {
        if (entry) {
          nextLookup[entry.key] = { taxCode: entry.taxCode, name: entry.name };
        }
      }
      setCompanyDetailsLookup(nextLookup);
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.companies]);

  useEffect(() => {
    let isMounted = true;
    const companyCd = normalizeDisplayText(currentCompanyCd);

    if (!companyCd) {
      setCompanyTaxCode("");
      setCompanyName("");
      return () => {
        isMounted = false;
      };
    }

    const loadCompanyInfo = async () => {
      try {
        const response = await getCompanyInfo(companyCd);
        if (!isMounted) {
          return;
        }

        const nextTaxCode =
          normalizeDisplayText(response.data?.TAX_CD) ||
          normalizeDisplayText(response.data?.COMPANY_CD) ||
          companyCd;
        const nextCompanyName =
          normalizeDisplayText(response.data?.COMPANY_NM) ||
          normalizeDisplayText(response.data?.COMPANY_NM_EN) ||
          normalizeDisplayText(response.data?.COMPANY_NM_KOR) ||
          companyCd;

        setCompanyTaxCode(nextTaxCode);
        setCompanyName(nextCompanyName);
      } catch {
        if (isMounted) {
          setCompanyTaxCode(companyCd);
          setCompanyName(companyCd);
        }
      }
    };

    void loadCompanyInfo();

    return () => {
      isMounted = false;
    };
  }, [currentCompanyCd]);

  const refreshNotificationSummary = useCallback(async () => {
    if (!SHOW_NOTIFICATIONS || !currentCompanyCd) {
      setUnreadCount(0);
      return;
    }

    try {
      const summary = await getNotificationSummary();
      setUnreadCount(summary.UNREAD_COUNT);
    } catch {
      setUnreadCount(0);
    }
  }, [currentCompanyCd]);

  const loadNotifications = useCallback(async () => {
    if (!SHOW_NOTIFICATIONS || !currentCompanyCd) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setNotificationsLoading(true);
    try {
      await syncNotifications();
      const [listResult, summary] = await Promise.all([
        getNotifications({ pageNumber: 1, pageSize: 20 }),
        getNotificationSummary({ force: true }),
      ]);
      setNotifications(listResult.items);
      setUnreadCount(summary.UNREAD_COUNT);
    } catch {
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, [currentCompanyCd]);

  useEffect(() => {
    if (!SHOW_NOTIFICATIONS) {
      return;
    }
    void refreshNotificationSummary();
  }, [refreshNotificationSummary]);

  const closeDropdowns = useCallback(() => {
    setIsLanguageDropdownOpen(false);
    setIsHelpDropdownOpen(false);
    setIsNotificationDropdownOpen(false);
    setIsUserDropdownOpen(false);
  }, []);

  const applyCompanySwitch = useCallback((nextCompanyCd: string) => {
    // Navigate first so getCurrentCompanyCd()/query keys point at the new company
    // before caches are wiped and reloaded (same race class as login→clearFrontendCaches).
    const targetPath = `${buildAppPath(nextCompanyCd, stripCompanyPathname(location.pathname))}${location.search}${location.hash}`;
    navigate(targetPath, { replace: true });

    clearNotificationSummaryCache();
    clearGridColumnSettings();
    clearFrontendCaches();
    updateCurrentSession({ defaultCompanyCd: nextCompanyCd });

    void (async () => {
      await Promise.allSettled([
        refreshGridColumnSettings(true),
        refreshSysCodes(),
      ]);
    })();
  }, [
    clearGridColumnSettings,
    location.hash,
    location.pathname,
    location.search,
    navigate,
    refreshGridColumnSettings,
    refreshSysCodes,
  ]);

  const handleCompanyChange = useCallback((event: ValueChangedEvent) => {
    const nextCompanyCd = normalizeDisplayText(event.value);
    const activeCompanyCd = normalizeDisplayText(currentCompanyCd);

    if (!event.event) {
      return;
    }

    if (!nextCompanyCd || nextCompanyCd.toUpperCase() === activeCompanyCd.toUpperCase()) {
      return;
    }

    const existsInSession = companyOptions.some(
      (company) => company.COMPANY_CD.toUpperCase() === nextCompanyCd.toUpperCase(),
    );
    if (!existsInSession) {
      event.component.option("value", activeCompanyCd);
      return;
    }

    closeDropdowns();

    void (async () => {
      const confirmed = await confirm(
        t(
          "MSG_CONFIRM_SWITCH_COMPANY",
          "Bạn có chắc muốn chuyển từ {0} sang {1}?",
        )
          .replace("{0}", activeCompanyCd)
          .replace("{1}", nextCompanyCd),
        t("MSG_CONFIRM_SWITCH_COMPANY_TITLE", "Xác nhận chuyển công ty"),
      );

      if (!confirmed) {
        event.component.option("value", activeCompanyCd);
        return;
      }

      applyCompanySwitch(nextCompanyCd);
    })();
  }, [
    applyCompanySwitch,
    companyOptions,
    currentCompanyCd,
    closeDropdowns,
    t,
  ]);

  const renderCompanyListItem = useCallback((data: CompanyOption) => (
    <div className="am-company-switcher-item">
      <div className="am-company-switcher-item__row">
        <span className="am-company-switcher-item__label">{t("COMPANY_CD", "ID")}</span>
        <span className="am-company-switcher-item__value">{data.COMPANY_CD}</span>
      </div>
      <div className="am-company-switcher-item__row">
        <span className="am-company-switcher-item__label">{t("TAX_CD", "MST")}</span>
        <span className="am-company-switcher-item__value">{data.TAX_CD}</span>
      </div>
      <div className="am-company-switcher-item__name">{data.COMPANY_NM}</div>
    </div>
  ), [t]);

  // NOTE: SelectBox's fieldRender/fieldTemplate REQUIRES the rendered
  // content to include a real element with class "dx-texteditor-input" —
  // DevExtreme looks it up after render (this.$element().find(".dx-texteditor-input"))
  // to wire focus/keyboard handling, and throws (crashing the whole page,
  // since nothing catches it) if none is found. It doesn't have to be
  // visible: it's kept present but invisible below, sized to cover the
  // clickable field, while the actual two-line code/name is drawn by plain
  // React markup on top of it — reading selectedCompanyOption/
  // companyDisplayName directly rather than the `data` argument DevExtreme
  // passes in, since displayMst is already computed above and kept in sync
  // with the real selected value.
  const renderCompanySwitcherField = useCallback(() => (
    <div className="am-company-switcher-field">
      <span className="am-company-switcher-field__icon">
        <Landmark size={16} />
      </span>
      <span className="am-company-switcher-field__text">
        <span className="am-company-switcher-field__label">{t("TAX_CD", "MST")}</span>
        <span className="am-company-switcher-field__code">{displayMst}</span>
      </span>
      <ChevronDown size={14} className="am-company-switcher-field__chevron" />
      <input
        aria-hidden="true"
        className="dx-texteditor-input am-company-switcher-field__hidden-input"
        readOnly
        tabIndex={-1}
        value=""
        onChange={() => {}}
      />
    </div>
  ), [displayMst, t]);

  const toggleLanguageDropdown = () => {
    setIsLanguageDropdownOpen((value) => !value);
    setIsHelpDropdownOpen(false);
    setIsNotificationDropdownOpen(false);
    setIsUserDropdownOpen(false);
  };

  const toggleHelpDropdown = () => {
    setIsHelpDropdownOpen((value) => !value);
    setIsLanguageDropdownOpen(false);
    setIsNotificationDropdownOpen(false);
    setIsUserDropdownOpen(false);
  };

  const toggleNotificationDropdown = () => {
    setIsNotificationDropdownOpen((value) => {
      const nextValue = !value;
      if (nextValue) {
        void loadNotifications();
      }
      return nextValue;
    });
    setIsLanguageDropdownOpen(false);
    setIsHelpDropdownOpen(false);
    setIsUserDropdownOpen(false);
  };

  const toggleUserDropdown = () => {
    setIsUserDropdownOpen((value) => !value);
    setIsLanguageDropdownOpen(false);
    setIsHelpDropdownOpen(false);
    setIsNotificationDropdownOpen(false);
  };

  const handleNotificationClick = useCallback(
    async (notification: SysNotificationItem) => {
      if (isNotificationUnread(notification)) {
        try {
          await markNotificationRead(notification.ID);
          setNotifications((current) =>
            current.map((item) =>
              item.ID === notification.ID ? { ...item, IS_READ: "Y", READ_AT: new Date().toISOString() } : item,
            ),
          );
          setUnreadCount((current) => Math.max(0, current - 1));
        } catch {
        }
      }

      closeDropdowns();
      const actionUrl = normalizeDisplayText(notification.ACTION_URL);
      if (actionUrl) {
        navigate(actionUrl.startsWith("/app/") ? actionUrl : buildAppPath(currentCompanyCd, actionUrl));
      }
    },
    [closeDropdowns, currentCompanyCd, navigate],
  );

  const handleMarkAllNotificationsRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((current) =>
        current.map((item) => ({ ...item, IS_READ: "Y", READ_AT: new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch {
    }
  }, []);

  const selectLanguage = (language: Language) => {
    setIsLanguageDropdownOpen(false);
    setLang(language.code);

    if (typeof refreshLabels === "function") {
      void refreshLabels(language.code);
    }
  };

  const handleLogout = () => {
    closeDropdowns();
    onLogout();
  };

  const handleProfileClick = () => {
    closeDropdowns();
    navigate(buildAppPath(currentCompanyCd, "/profile"));
  };

  const handleHelpClick = () => {
    closeDropdowns();
    navigate(buildAppPath(currentCompanyCd, "/help-support"));
  };

  const handleClearCache = () => {
    closeDropdowns();
    clearFrontendCaches();
    clearNotificationSummaryCache();
    clearSysCodes();
    window.location.reload();
  };

  const handleShortcutHelpClick = () => {
    closeDropdowns();
    dispatchShortcutCombo(SHORTCUT_KEYS.HELP);
  };

  return (
    <header className={`relative z-[11] flex h-14 items-center border-b px-3 py-2 ${headerSurfaceClass}`}>
      {menuLayout === "header" ? (
        <button
          type="button"
          aria-label={
            showHeaderMenuBar
              ? t("HEADER_MENU_BAR_COLLAPSE", "Thu gọn menu")
              : t("HEADER_MENU_BAR_EXPAND", "Mở rộng menu")
          }
          aria-pressed={showHeaderMenuBar}
          className="absolute bottom-0 left-1/2 z-[12] flex h-5 w-7 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
          onClick={() => setShowHeaderMenuBar(!showHeaderMenuBar)}
          title={
            showHeaderMenuBar
              ? t("HEADER_MENU_BAR_COLLAPSE", "Thu gọn menu")
              : t("HEADER_MENU_BAR_EXPAND", "Mở rộng menu")
          }
        >
          {showHeaderMenuBar ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      ) : null}
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className={`whitespace-nowrap text-xs font-bold uppercase tracking-[0.18em] ${titleTextClass}`}>
                {translatedSystemTitle}
              </span>
              {shouldShowPageBadge && (
                <>
                  <span className={`hidden text-sm sm:inline-block ${mutedTextClass}`}>/</span>
                  <span className={`truncate rounded-full px-3 py-1 text-sm font-semibold ${pageBadgeClass}`}>
                    {translatedCurrentMenuTitle}
                  </span>
                </>
              )}
            </div>
            {showHeaderGroupTabs && (
              <div className="finance-header-group-tabs">
                {headerGroupTabs.map((group) => {
                  const isActive = financeTier.activeGroup?.id === group.id;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      disabled={group.isDisabled}
                      className={`finance-header-group-tabs__tab${isActive ? " finance-header-group-tabs__tab--active" : ""}`}
                      onClick={() => financeTier.handleGroupClick(group)}
                    >
                      {financeTier.label(group)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center space-x-2 sm:space-x-4">
          {companyOptions.length > 0 && (
            <div className="hidden sm:block" title={companySwitchTooltip}>
              <SelectBox
                className="am-company-switcher"
                dataSource={enrichedCompanyOptions}
                displayExpr="displayName"
                dropDownOptions={{ maxHeight: 360, width: 320 }}
                fieldRender={renderCompanySwitcherField}
                inputAttr={{ "aria-label": companySwitchTooltip }}
                itemRender={renderCompanyListItem}
                onValueChanged={handleCompanyChange}
                searchEnabled={false}
                showClearButton={false}
                showDataBeforeSearch={true}
                stylingMode="outlined"
                value={selectedCompanyCd}
                valueExpr="COMPANY_CD"
              />
            </div>
          )}

          <div className="hidden h-6 w-px bg-gray-200 sm:block" />

          <div className="relative">
            <button
              aria-expanded={isLanguageDropdownOpen}
              aria-haspopup="menu"
              aria-label={languageTooltip}
              className={headerActionButtonClass}
              onClick={toggleLanguageDropdown}
              title={languageTooltip}
              type="button"
            >
              <Globe size={18} className="am-icon-header-language" />
            </button>

            {isLanguageDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={closeDropdowns} />
                <div className={`absolute right-0 z-20 mt-2 w-48 rounded-lg border py-2 ${dropdownSurfaceClass}`}>
                  <div className={`border-b px-3 py-2 ${dividerClass}`}>
                    <div className="flex items-center space-x-2">
                      <Globe size={16} className={mutedTextClass} />
                      <span className={`text-sm font-medium ${bodyTextClass}`}>
                          {t("selectLanguage", "Select language")}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    {visibleLanguages.map((language) => (
                      <button
                        key={language.code}
                        onClick={() => selectLanguage(language)}
                        className={`w-full px-4 py-2 text-sm transition-colors ${itemHoverClass} ${
                          selectedLanguage.code === language.code ? selectedItemClass : bodyTextClass
                        }`}
                        type="button"
                      >
                        <span className="flex items-center space-x-3">
                          <span className="text-lg">{language.flag}</span>
                          <span className="flex-1 text-left">{getLanguageLabel(language)}</span>
                          {selectedLanguage.code === language.code && (
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button
              aria-expanded={isHelpDropdownOpen}
              aria-haspopup="menu"
              aria-label={t("helpSupport", "Help & Support")}
              className={headerActionButtonClass}
              onClick={toggleHelpDropdown}
              title={helpTooltip}
              type="button"
            >
              <HelpCircle size={18} className="am-icon-header-help" />
            </button>

            {isHelpDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={closeDropdowns} />
                <div className={`absolute right-0 z-20 mt-2 w-72 rounded-lg border py-2 ${dropdownSurfaceClass}`}>
                  <div className={`border-b px-4 py-3 ${dividerClass}`}>
                    <div className="flex items-center gap-2">
                      <HelpCircle size={16} className={mutedTextClass} />
                      <div>
                        <div className={`text-sm font-semibold ${titleTextClass}`}>
                          {t("helpSupport", "Help & Support")}
                        </div>
                        <div className={`text-xs ${mutedTextClass}`}>{t("supportTools", "Support tools")}</div>
                      </div>
                    </div>
                  </div>

                  <div className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${dividerClass}`}>
                    <div className="min-w-0">
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${mutedTextClass}`}>
                        <Type size={14} />
                        <span>{t("fontSize", "Cỡ chữ")}</span>
                      </div>
                      <div className={`mt-0.5 text-sm font-medium ${bodyTextClass}`}>{fontSizePx}px</div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        aria-label={t("decreaseFontSize", "Giảm cỡ chữ")}
                        className={`rounded-lg p-2 transition-colors ${hoverSurfaceClass} disabled:cursor-not-allowed disabled:opacity-40`}
                        disabled={!canDecreaseFont}
                        onClick={decreaseFontSize}
                        title={t("decreaseFontSize", "Giảm cỡ chữ")}
                        type="button"
                      >
                        <Minus size={16} className={iconTextClass} />
                      </button>
                      <button
                        aria-label={t("increaseFontSize", "Tăng cỡ chữ")}
                        className={`rounded-lg p-2 transition-colors ${hoverSurfaceClass} disabled:cursor-not-allowed disabled:opacity-40`}
                        disabled={!canIncreaseFont}
                        onClick={increaseFontSize}
                        title={t("increaseFontSize", "Tăng cỡ chữ")}
                        type="button"
                      >
                        <Plus size={16} className={iconTextClass} />
                      </button>
                    </div>
                  </div>

                  <div className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${dividerClass}`}>
                    <div className="min-w-0">
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${mutedTextClass}`}>
                        <Menu size={14} />
                        <span>{t("MENU_LAYOUT", "Vị trí menu")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        aria-label={t("MENU_LAYOUT_SIDEBAR", "Menu trái")}
                        aria-pressed={menuLayout === "sidebar"}
                        className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                          menuLayout === "sidebar" ? selectedItemClass : hoverSurfaceClass
                        }`}
                        onClick={() => setMenuLayout("sidebar")}
                        title={t("MENU_LAYOUT_SIDEBAR", "Menu trái")}
                        type="button"
                      >
                        {t("MENU_LAYOUT_SIDEBAR", "Menu trái")}
                      </button>
                      <button
                        aria-label={t("MENU_LAYOUT_HEADER", "Menu header")}
                        aria-pressed={menuLayout === "header"}
                        className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                          menuLayout === "header" ? selectedItemClass : hoverSurfaceClass
                        }`}
                        onClick={() => setMenuLayout("header")}
                        title={t("MENU_LAYOUT_HEADER", "Menu header")}
                        type="button"
                      >
                        {t("MENU_LAYOUT_HEADER", "Menu header")}
                      </button>
                    </div>
                  </div>

                  {menuLayout === "sidebar" ? (
                    <div className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${dividerClass}`}>
                      <div className="min-w-0">
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${mutedTextClass}`}>
                          <Layers size={14} />
                          <span>{t("WORKSPACE_BAR", "Thanh workspace")}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          aria-label={t("WORKSPACE_BAR_SHOW", "Hiện")}
                          aria-pressed={showWorkspaceBar}
                          className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                            showWorkspaceBar ? selectedItemClass : hoverSurfaceClass
                          }`}
                          onClick={() => setShowWorkspaceBar(true)}
                          title={t("WORKSPACE_BAR_SHOW", "Hiện")}
                          type="button"
                        >
                          {t("WORKSPACE_BAR_SHOW", "Hiện")}
                        </button>
                        <button
                          aria-label={t("WORKSPACE_BAR_HIDE", "Ẩn")}
                          aria-pressed={!showWorkspaceBar}
                          className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                            !showWorkspaceBar ? selectedItemClass : hoverSurfaceClass
                          }`}
                          onClick={() => setShowWorkspaceBar(false)}
                          title={t("WORKSPACE_BAR_HIDE", "Ẩn")}
                          type="button"
                        >
                          {t("WORKSPACE_BAR_HIDE", "Ẩn")}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="py-2">
                    {SHOW_USER_GUIDE ? (
                      <button
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left text-sm opacity-60 ${bodyTextClass}`}
                        disabled={true}
                        type="button"
                      >
                        <BookOpen size={16} className={`mt-0.5 ${mutedTextClass}`} />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{t("userGuide", "User guide")}</div>
                          <div className={`mt-1 text-xs ${mutedTextClass}`}>
                            {t("userGuidePlaceholder", "Temporary placeholder, not in use yet")}
                          </div>
                        </div>
                      </button>
                    ) : null}

                    <button
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition-colors ${itemHoverClass} ${bodyTextClass}`}
                      onClick={handleShortcutHelpClick}
                      type="button"
                    >
                      <Globe size={16} className={`mt-0.5 ${mutedTextClass}`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{t("screenShortcuts", "Screen shortcuts")}</div>
                        <div className={`mt-1 text-xs ${mutedTextClass}`}>
                          {t("openShortcutPopup", "Open the current F1 shortcut popup")} ({SHORTCUT_KEYS.HELP.toUpperCase()})
                        </div>
                      </div>
                    </button>

                    <button
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition-colors ${itemHoverClass} ${bodyTextClass}`}
                      onClick={handleHelpClick}
                      type="button"
                    >
                      <Settings size={16} className={`mt-0.5 ${mutedTextClass}`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{t("helpCenter", "Help center")}</div>
                        <div className={`mt-1 text-xs ${mutedTextClass}`}>
                          {t("openSupportPage", "Open the support and documentation page")}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {SHOW_NOTIFICATIONS ? (
          <div className="relative">
            <button
              className={`relative ${headerActionButtonClass}`}
              onClick={toggleNotificationDropdown}
              type="button"
            >
              <Bell size={18} className="am-icon-header-bell" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotificationDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={closeDropdowns} />
                <div
                  className={`absolute right-0 z-20 mt-2 w-full max-w-[95vw] rounded-2xl border sm:w-80 sm:max-w-none sm:rounded-lg ${dropdownSurfaceClass}`}
                  style={{ minWidth: "260px" }}
                >
                  <div className={`border-b px-4 py-3 ${dividerClass}`}>
                    <div className="flex items-center justify-between">
                      <h3 className={`font-semibold ${titleTextClass}`}>{t("notifications", "Thông báo")}</h3>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">
                          {unreadCount} {t("new", "mới")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notificationsLoading ? (
                      <div className="px-4 py-8 text-center">
                        <p className={`text-sm ${mutedTextClass}`}>{t("loading", "Đang tải...")}</p>
                      </div>
                    ) : notifications.length > 0 ? (
                      <div className="py-2">
                        {notifications.map((notification) => {
                          const unread = isNotificationUnread(notification);
                          const displayType = mapNotificationDisplayType(
                            notification.PRIORITY,
                            notification.NOTIFICATION_TYPE,
                          );

                          return (
                          <button
                            key={notification.ID}
                            type="button"
                            className={`block w-full border-l-4 px-4 py-3 text-left transition-colors ${itemHoverClass} ${
                              unread ? "border-l-blue-500 bg-blue-50" : "border-l-transparent"
                            }`}
                            onClick={() => {
                              void handleNotificationClick(notification);
                            }}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="mt-0.5 flex-shrink-0">{getNotificationIcon(displayType)}</div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className={`text-sm font-medium ${unread ? titleTextClass : bodyTextClass}`}>
                                      {notification.TITLE}
                                    </p>
                                    {notification.MESSAGE ? (
                                      <p className={`mt-1 text-sm ${mutedTextClass}`}>{notification.MESSAGE}</p>
                                    ) : null}
                                    <p className={`mt-2 text-xs ${mutedTextClass}`}>
                                      {formatNotificationTime(notification.CREATE_AT)}
                                    </p>
                                  </div>
                                  {unread ? (
                                    <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <Bell size={32} className={`mx-auto mb-2 ${mutedTextClass}`} />
                        <p className={`text-sm ${mutedTextClass}`}>{t("noNotifications", "Không có thông báo")}</p>
                      </div>
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className={`border-t px-4 py-3 ${dividerClass}`}>
                      <div className="flex items-center justify-between">
                        <button
                          className="font-medium text-blue-600 hover:text-blue-700"
                          type="button"
                          onClick={() => {
                            void handleMarkAllNotificationsRead();
                          }}
                        >
                          {t("markAllAsRead", "Đánh dấu đã đọc")}
                        </button>
                        <button
                          className={mutedTextClass}
                          type="button"
                          onClick={() => {
                            void loadNotifications();
                          }}
                        >
                          {t("refresh", "Làm mới")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          ) : null}

          <div className="relative">
            <button
              aria-expanded={isUserDropdownOpen}
              aria-haspopup="menu"
              aria-label={displayUserId || t("USER", "User")}
              className={`rounded-lg p-2 transition-colors ${hoverSurfaceClass}`}
              onClick={toggleUserDropdown}
              title={userTooltip}
              type="button"
            >
              <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-red-600">
                {headerAvatarSrc ? (
                  <img src={headerAvatarSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-medium text-white">{userInitials}</span>
                )}
              </div>
            </button>

            {isUserDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={closeDropdowns} />
                <div className={`absolute right-0 z-20 mt-2 w-64 rounded-lg border py-2 ${dropdownSurfaceClass}`}>
                  <div className={`border-b px-4 py-3 ${dividerClass}`}>
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-red-600">
                        {headerAvatarSrc ? (
                          <img src={headerAvatarSrc} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm font-medium text-white">{userInitials}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className={`max-w-40 truncate text-sm ${bodyTextClass}`}>
                          <span className={`font-medium ${mutedTextClass}`}>{t("USER_ID", "ID")}: </span>
                          <span className="font-semibold">{displayUserId}</span>
                        </div>
                        <div className={`max-w-40 truncate text-sm ${bodyTextClass}`}>
                          <span className={`font-medium ${mutedTextClass}`}>{t("TAX_CD", "MST")}: </span>
                          <span className="font-semibold">{displayMst}</span>
                        </div>
                        <div className={`max-w-40 truncate text-xs ${mutedTextClass}`}>{companyDisplayName}</div>
                      </div>
                    </div>
                  </div>

                  <div className="py-2">
                    <button
                      onClick={handleProfileClick}
                      className={`flex w-full items-center px-4 py-2 text-sm transition-colors ${itemHoverClass} ${bodyTextClass}`}
                      type="button"
                    >
                      <User size={16} className={`mr-3 ${mutedTextClass}`} />
                      {t("PROFILE", "Hồ sơ")}
                    </button>

                    <button
                      onClick={() => navigate(buildAppPath(currentCompanyCd, "/company"))}
                      className={`flex w-full items-center px-4 py-2 text-sm transition-colors ${itemHoverClass} ${bodyTextClass}`}
                      type="button"
                    >
                      <Settings size={16} className={`mr-3 ${mutedTextClass}`} />
                      {t("companyDetails", "Chi tiết công ty")}
                    </button>

                    <button
                      onClick={handleHelpClick}
                      className={`flex w-full items-center px-4 py-2 text-sm transition-colors ${itemHoverClass} ${bodyTextClass}`}
                      type="button"
                    >
                      <HelpCircle size={16} className={`mr-3 ${mutedTextClass}`} />
                      {t("helpSupport", "Trợ giúp & Hỗ trợ")}
                    </button>

                    <button
                      onClick={() => {
                        void handleClearCache();
                      }}
                      className={`flex w-full items-center px-4 py-2 text-sm transition-colors ${itemHoverClass} ${bodyTextClass}`}
                      type="button"
                    >
                      <Eraser size={16} className={`mr-3 ${mutedTextClass}`} />
                      {t("clearCache", "Tải lại trình duyệt")}
                    </button>
                  </div>

                  <div className={`my-2 border-t ${dividerClass}`} />

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                    type="button"
                  >
                    <LogOut size={16} className="mr-3" />
                    {t("logout", "Đăng xuất")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
