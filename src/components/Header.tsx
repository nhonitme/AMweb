import { useContext, useEffect, useMemo, useState } from "react";
import SelectBox from "devextreme-react/select-box";
import { useNavigate } from "react-router-dom";
import type { ValueChangedEvent } from "devextreme/ui/select_box";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CheckCircle,
  Clock,
  Globe,
  HelpCircle,
  LogOut,
  Menu,
  Palette,
  Settings,
  User,
} from "lucide-react";

import { getCompanyInfo } from "@/api/companyInfoApi";
import { useTheme } from "@/components/theme-provider";
import { LanguageContext } from "@/lib/i18nLoader";
import { AUTH_SESSION_CHANGED_EVENT, getCurrentSession, type AuthSession } from "@/lib/login";
import type { DevExtremeThemeOption } from "@/lib/devextremeThemes";
import { DEFAULT_DEVEXTREME_THEME } from "@/lib/devextremeThemes";
import { SHORTCUT_KEYS } from "@/lib/shortcuts/shortcutKeys";
import { dispatchShortcutCombo } from "@/lib/shortcuts/shortcutUtils";
import { languages, type Language } from "@/utils/language";

interface HeaderProps {
  currentMenuTitle?: string;
  onLogout: () => void;
  onToggleSidebar: () => void;
  systemTitle?: string;
}

interface Notification {
  id: string;
  isRead: boolean;
  message: string;
  time: string;
  title: string;
  type: "error" | "info" | "success" | "warning";
}

type ThemeGroup = {
  items: DevExtremeThemeOption[];
  key: string;
};

const notifications: Notification[] = [
  {
    id: "1",
    isRead: false,
    message: "Customer ABC has an overdue balance for 30 days.",
    time: "5 minutes ago",
    title: "Overdue receivable",
    type: "error",
  },
  {
    id: "2",
    isRead: false,
    message: "VCB bank account balance is running low.",
    time: "15 minutes ago",
    title: "Low cash flow",
    type: "warning",
  },
  {
    id: "3",
    isRead: true,
    message: "The November finance report is now available.",
    time: "1 hour ago",
    title: "New report",
    type: "info",
  },
  {
    id: "4",
    isRead: true,
    message: "Invoice INV-2024-001 has been paid successfully.",
    time: "2 hours ago",
    title: "Payment completed",
    type: "success",
  },
  {
    id: "5",
    isRead: true,
    message: "Product A1 has only 5 units left in stock.",
    time: "3 hours ago",
    title: "Low inventory",
    type: "warning",
  },
];

function buildThemeGroups(themes: DevExtremeThemeOption[]): ThemeGroup[] {
  const groups = themes.reduce<Record<string, DevExtremeThemeOption[]>>((accumulator, themeOption) => {
    const groupKey = themeOption.familyLabel;
    if (!accumulator[groupKey]) {
      accumulator[groupKey] = [];
    }

    accumulator[groupKey].push(themeOption);
    return accumulator;
  }, {});

  return Object.entries(groups).map(([key, items]) => ({
    items,
    key,
  }));
}

function getNotificationIcon(type: Notification["type"]): JSX.Element {
  switch (type) {
    case "error":
      return <AlertTriangle size={16} className="text-red-500" />;
    case "warning":
      return <Clock size={16} className="text-amber-500" />;
    case "success":
      return <CheckCircle size={16} className="text-green-500" />;
    default:
      return <Bell size={16} className="text-blue-500" />;
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

export default function Header({ onToggleSidebar, onLogout, currentMenuTitle, systemTitle }: HeaderProps) {
  const navigate = useNavigate();
  const { lang, setLang, refreshLabels, translate } = useContext(LanguageContext) as {
    lang: string;
    refreshLabels?: (lang?: string) => Promise<void>;
    setLang: (langCode: string) => void;
    translate: (key: string, fallback?: string) => string;
  };
  const { currentTheme, setTheme, theme, themes } = useTheme();
  const [session, setSession] = useState<AuthSession | null>(() => getCurrentSession());
  const [companyName, setCompanyName] = useState("");
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [isHelpDropdownOpen, setIsHelpDropdownOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const t = (key: string, fallback?: string) => (translate ? translate(key, fallback) : fallback ?? key);
  const getLanguageLabel = (language: Language) =>
    t(`language.${language.code}`, language.name);

  const selectedLanguage = useMemo(
    () => languages.find((language) => language.code === lang) ?? languages[0],
    [lang],
  );
  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.isRead).length, []);
  const themeGroups = useMemo(() => buildThemeGroups(themes), [themes]);
  const isDarkTheme = currentTheme.isDark;
  const translatedSystemTitle = useMemo(
    () => (systemTitle ? t(systemTitle, systemTitle) : t("brand", "AMnote")),
    [systemTitle, t],
  );
  const translatedCurrentMenuTitle = useMemo(
    () => (currentMenuTitle ? t(currentMenuTitle, currentMenuTitle) : t("dashboard", "Dashboard")),
    [currentMenuTitle, t],
  );
  const companyDisplayName = useMemo(
    () =>
      normalizeDisplayText(companyName) ||
      normalizeDisplayText(session?.companyCd) ||
      t("COMPANY", "Company"),
    [companyName, session?.companyCd, t],
  );
  const userDisplayName = useMemo(
    () =>
      normalizeDisplayText(session?.username) ||
      normalizeDisplayText(session?.userId) ||
      t("USER", "User"),
    [session?.userId, session?.username, t],
  );
  const userMetaText = useMemo(
    () =>
      normalizeDisplayText(session?.userId) ||
      normalizeDisplayText(session?.companyCd) ||
      t("account", "Account"),
    [session?.companyCd, session?.userId, t],
  );
  const userInitials = useMemo(
    () => buildUserInitials(userDisplayName, session?.userId),
    [session?.userId, userDisplayName],
  );
  const languageTooltip = useMemo(
    () => `${t("language", "Language")}: ${getLanguageLabel(selectedLanguage)}`,
    [selectedLanguage, t],
  );
  const themeTooltip = useMemo(
    () => `${t("theme", "Theme")}: ${currentTheme.label}`,
    [currentTheme.label, t],
  );
  const helpTooltip = useMemo(
    () => buildTooltipText(t("helpSupport", "Help & Support"), t("shortcutHelp", "Shortcut help")),
    [t],
  );
  const userTooltip = useMemo(
    () => buildTooltipText(userDisplayName, userMetaText, companyDisplayName),
    [companyDisplayName, userDisplayName, userMetaText],
  );
  const shouldShowPageBadge = useMemo(() => {
    const normalizedSystemTitle = normalizeDisplayText(translatedSystemTitle).toLocaleLowerCase();
    const normalizedCurrentMenuTitle = normalizeDisplayText(translatedCurrentMenuTitle).toLocaleLowerCase();

    return Boolean(normalizedCurrentMenuTitle) && normalizedCurrentMenuTitle !== normalizedSystemTitle;
  }, [translatedCurrentMenuTitle, translatedSystemTitle]);

  const headerSurfaceClass = isDarkTheme ? "bg-slate-950 border-slate-800" : "bg-white border-gray-200";
  const dropdownSurfaceClass = isDarkTheme
    ? "bg-slate-950 border-slate-800 shadow-2xl"
    : "bg-white border-gray-200 shadow-lg";
  const hoverSurfaceClass = isDarkTheme ? "hover:bg-slate-900" : "hover:bg-gray-100";
  const itemHoverClass = isDarkTheme ? "hover:bg-slate-900" : "hover:bg-gray-50";
  const titleTextClass = isDarkTheme ? "text-slate-50" : "text-gray-900";
  const bodyTextClass = isDarkTheme ? "text-slate-100" : "text-gray-700";
  const mutedTextClass = isDarkTheme ? "text-slate-400" : "text-gray-500";
  const iconTextClass = isDarkTheme ? "text-slate-300" : "text-gray-600";
  const dividerClass = isDarkTheme ? "border-slate-800" : "border-gray-100";
  const selectedItemClass = isDarkTheme ? "bg-blue-950/50 text-blue-200" : "bg-blue-50 text-blue-700";
  const badgeClass = isDarkTheme ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-gray-600";
  const brandSurfaceClass = isDarkTheme ? "border-slate-700 bg-slate-900" : "border-red-100 bg-red-50";
  const pageBadgeClass = isDarkTheme ? "bg-slate-900 text-slate-300" : "bg-slate-100 text-slate-600";

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
    let isMounted = true;
    const companyCd = normalizeDisplayText(session?.companyCd);

    if (!companyCd) {
      setCompanyName("");
      return () => {
        isMounted = false;
      };
    }

    const loadCompanyName = async () => {
      try {
        const response = await getCompanyInfo(companyCd);
        if (!isMounted) {
          return;
        }

        const nextCompanyName =
          normalizeDisplayText(response.data?.COMPANY_NM) ||
          normalizeDisplayText(response.data?.COMPANY_NM_EN) ||
          normalizeDisplayText(response.data?.COMPANY_NM_KOR) ||
          companyCd;

        setCompanyName(nextCompanyName);
      } catch {
        if (isMounted) {
          setCompanyName(companyCd);
        }
      }
    };

    void loadCompanyName();

    return () => {
      isMounted = false;
    };
  }, [session?.companyCd]);

  const closeDropdowns = () => {
    setIsLanguageDropdownOpen(false);
    setIsHelpDropdownOpen(false);
    setIsNotificationDropdownOpen(false);
    setIsThemeDropdownOpen(false);
    setIsUserDropdownOpen(false);
  };

  const toggleLanguageDropdown = () => {
    setIsLanguageDropdownOpen((value) => !value);
    setIsHelpDropdownOpen(false);
    setIsNotificationDropdownOpen(false);
    setIsThemeDropdownOpen(false);
    setIsUserDropdownOpen(false);
  };

  const toggleHelpDropdown = () => {
    setIsHelpDropdownOpen((value) => !value);
    setIsLanguageDropdownOpen(false);
    setIsNotificationDropdownOpen(false);
    setIsThemeDropdownOpen(false);
    setIsUserDropdownOpen(false);
  };

  const toggleNotificationDropdown = () => {
    setIsNotificationDropdownOpen((value) => !value);
    setIsLanguageDropdownOpen(false);
    setIsHelpDropdownOpen(false);
    setIsThemeDropdownOpen(false);
    setIsUserDropdownOpen(false);
  };

  const toggleThemeDropdown = () => {
    setIsThemeDropdownOpen((value) => !value);
    setIsLanguageDropdownOpen(false);
    setIsHelpDropdownOpen(false);
    setIsNotificationDropdownOpen(false);
    setIsUserDropdownOpen(false);
  };

  const toggleUserDropdown = () => {
    setIsUserDropdownOpen((value) => !value);
    setIsLanguageDropdownOpen(false);
    setIsHelpDropdownOpen(false);
    setIsNotificationDropdownOpen(false);
    setIsThemeDropdownOpen(false);
  };

  const selectLanguage = (language: Language) => {
    setIsLanguageDropdownOpen(false);
    setLang(language.code);

    if (typeof refreshLabels === "function") {
      void refreshLabels(language.code);
    }
  };

  const handleThemeChange = (event: ValueChangedEvent) => {
    if (typeof event.value !== "string") {
      return;
    }

    setTheme(event.value);
    setIsThemeDropdownOpen(false);
  };

  const handleLogout = () => {
    closeDropdowns();
    onLogout();
  };

  const handleProfileClick = () => {
    closeDropdowns();
    navigate("/profile");
  };

  const handleHelpClick = () => {
    closeDropdowns();
    navigate("/help-support");
  };

  const handleShortcutHelpClick = () => {
    closeDropdowns();
    dispatchShortcutCombo(SHORTCUT_KEYS.HELP);
  };

  const viThemeLabelMap: Record<string, string> = {
    "fluent.blue.light": "Fluent Blue Light",
    "fluent.blue.light.compact": "Fluent Blue Light (Compact)",
    "fluent.saas.dark": "Fluent SaaS Dark",
    "fluent.saas.dark.compact": "Fluent SaaS Dark (Compact)",
    "fluent.saas.light": "Fluent SaaS Light",
    "fluent.saas.light.compact": "Fluent SaaS Light (Compact)",
  };

  const getTranslatedThemeLabel = (theme: DevExtremeThemeOption) => {
    const label = theme.label;
    const translation = translate(`theme.${theme.id}`, label);

    if (lang === "vi" && viThemeLabelMap[theme.id]) {
      return viThemeLabelMap[theme.id];
    }

    return translation;
  };

  const renderThemeItem = (item: unknown) => {
    const themeOption = item as DevExtremeThemeOption | undefined;

    if (!themeOption) {
      return null;
    }

    const label = getTranslatedThemeLabel(themeOption);

    return (
      <div className="flex items-center justify-between gap-3 py-1">
        <div className="min-w-0 flex-1">
          <div className={`truncate text-sm font-medium ${bodyTextClass}`}>{label}</div>
          <div className={`truncate text-xs ${mutedTextClass}`}>{themeOption.id}</div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}>
          {themeOption.familyLabel}
        </span>
      </div>
    );
  };

  const renderThemeGroup = (group: unknown) => {
    const themeGroup = group as ThemeGroup | undefined;

    if (!themeGroup) {
      return null;
    }

    return (
      <div className={`px-1 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${mutedTextClass}`}>
        {themeGroup.key}
      </div>
    );
  };

  return (
    <header className={`z-[11] flex h-14 items-center border-b px-3 py-2 ${headerSurfaceClass}`}>
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            onClick={onToggleSidebar}
            className={`rounded-lg p-1.5 transition-colors ${hoverSurfaceClass}`}
            type="button"
          >
            <Menu size={20} className={iconTextClass} />
          </button>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border ${brandSurfaceClass}`}>
              <img
                src="/img/amnote_logo.svg"
                alt="AMnote"
                className="h-6 w-6 object-contain"
                draggable={false}
              />
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <span className={`hidden whitespace-nowrap text-xs font-bold uppercase tracking-[0.18em] sm:inline-block ${titleTextClass}`}>
                {translatedSystemTitle}
              </span>
              <span className={`hidden text-sm lg:inline-block ${mutedTextClass}`}>/</span>
              <span
                className={`max-w-[9rem] truncate text-sm font-semibold sm:max-w-[13rem] lg:max-w-[20rem] ${titleTextClass}`}
                title={companyDisplayName}
              >
                {companyDisplayName}
              </span>
              {shouldShowPageBadge && (
                <span className={`hidden rounded-full px-2.5 py-1 text-xs font-medium lg:inline-flex ${pageBadgeClass}`}>
                  {translatedCurrentMenuTitle}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center space-x-2 sm:space-x-4">
          <div className="relative">
            <button
              aria-expanded={isLanguageDropdownOpen}
              aria-haspopup="menu"
              aria-label={languageTooltip}
              className={`rounded-lg p-2 transition-colors ${hoverSurfaceClass}`}
              onClick={toggleLanguageDropdown}
              title={languageTooltip}
              type="button"
            >
              <Globe size={18} className={iconTextClass} />
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
                    {languages.map((language) => (
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
              aria-expanded={isThemeDropdownOpen}
              aria-haspopup="menu"
              aria-label={themeTooltip}
              className={`rounded-lg p-2 transition-colors ${hoverSurfaceClass}`}
              onClick={toggleThemeDropdown}
              title={themeTooltip}
              type="button"
            >
              <Palette size={18} className={iconTextClass} />
            </button>

            {isThemeDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={closeDropdowns} />
                <div
                  className={`absolute right-0 z-20 mt-2 w-[min(24rem,calc(100vw-1rem))] rounded-2xl border p-4 ${dropdownSurfaceClass}`}
                >
                  <div className={`border-b pb-3 ${dividerClass}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Palette size={16} className={mutedTextClass} />
                          <h3 className={`text-sm font-semibold ${titleTextClass}`}>
                            {t("theme", "Chủ đề")}
                          </h3>
                        </div>
                        <p className={`mt-1 text-xs ${mutedTextClass}`}>
                          {t("availableThemes", "Chủ đề có sẵn")}: {themes.length}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${badgeClass}`}>
                          {currentTheme.familyLabel}
                        </span>
                        <button
                          type="button"
                          className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${hoverSurfaceClass}`}
                          onClick={() => {
                            setTheme(DEFAULT_DEVEXTREME_THEME);
                            setIsThemeDropdownOpen(false);
                          }}
                        >
                          {t("Reset", "Reset")}
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className={`mb-1 text-xs font-medium ${mutedTextClass}`}>
                        {t("currentTheme", "Chủ đề hiện tại")}
                      </div>
                      <div className={`text-sm font-medium ${bodyTextClass}`}>{currentTheme.label}</div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <SelectBox
                      dataSource={themeGroups}
                      displayExpr="label"
                      dropDownOptions={{ maxHeight: 420 }}
                      grouped={true}
                      groupRender={renderThemeGroup}
                      itemRender={renderThemeItem}
                      onValueChanged={handleThemeChange}
                      searchEnabled={true}
                      searchExpr={["label", "id", "searchText"]}
                      searchMode="contains"
                      searchPlaceholder={t("searchTheme", "Tìm kiếm chủ đề")}
                      showDataBeforeSearch={true}
                      stylingMode="outlined"
                      value={theme}
                      valueExpr="id"
                    />
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
              className={`rounded-lg p-2 transition-colors ${hoverSurfaceClass}`}
              onClick={toggleHelpDropdown}
              title={helpTooltip}
              type="button"
            >
              <HelpCircle size={18} className={iconTextClass} />
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

                  <div className="py-2">
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

          <div className="relative">
            <button
              className={`relative rounded-lg p-2 transition-colors ${hoverSurfaceClass}`}
              onClick={toggleNotificationDropdown}
              type="button"
            >
              <Bell size={18} className={iconTextClass} />
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
                    {notifications.length > 0 ? (
                      <div className="py-2">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`border-l-4 px-4 py-3 transition-colors ${itemHoverClass} ${
                              !notification.isRead
                                ? isDarkTheme
                                  ? "border-l-blue-400 bg-blue-950/30"
                                  : "border-l-blue-500 bg-blue-50"
                                : "border-l-transparent"
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="mt-0.5 flex-shrink-0">{getNotificationIcon(notification.type)}</div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className={`text-sm font-medium ${!notification.isRead ? titleTextClass : bodyTextClass}`}>
                                      {notification.title}
                                    </p>
                                    <p className={`mt-1 text-sm ${mutedTextClass}`}>{notification.message}</p>
                                    <p className={`mt-2 text-xs ${mutedTextClass}`}>{notification.time}</p>
                                  </div>
                                  {!notification.isRead && (
                                    <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <Bell size={32} className={`mx-auto mb-2 ${mutedTextClass}`} />
                        <p className={`text-sm ${mutedTextClass}`}>{t("noNotifications", "No notifications")}</p>
                      </div>
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className={`border-t px-4 py-3 ${dividerClass}`}>
                      <div className="flex items-center justify-between">
                        <button className="font-medium text-blue-600 hover:text-blue-700" type="button">
                          {t("markAllAsRead", "Mark all as read")}
                        </button>
                        <button className={mutedTextClass} type="button">
                          {t("viewAll", "View all")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button
              aria-expanded={isUserDropdownOpen}
              aria-haspopup="menu"
              aria-label={userDisplayName}
              className={`rounded-lg p-2 transition-colors ${hoverSurfaceClass}`}
              onClick={toggleUserDropdown}
              title={userTooltip}
              type="button"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600">
                <span className="text-xs font-medium text-white">{userInitials}</span>
              </div>
            </button>

            {isUserDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={closeDropdowns} />
                <div className={`absolute right-0 z-20 mt-2 w-64 rounded-lg border py-2 ${dropdownSurfaceClass}`}>
                  <div className={`border-b px-4 py-3 ${dividerClass}`}>
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600">
                        <span className="text-sm font-medium text-white">{userInitials}</span>
                      </div>
                      <div>
                        <div className={`max-w-40 truncate font-medium ${titleTextClass}`}>{userDisplayName}</div>
                        <div className={`max-w-40 truncate text-sm ${mutedTextClass}`}>{userMetaText}</div>
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
                      onClick={() => navigate("/company")}
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
