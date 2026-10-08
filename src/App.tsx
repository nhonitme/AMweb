import { lazy, memo, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    SIDEBAR_COLLAPSED_WIDTH,
    SIDEBAR_DEFAULT_WIDTH,
    SIDEBAR_MAX_WIDTH,
    SIDEBAR_MIN_WIDTH,
    useSidebarWidth,
} from '@/hooks/useSidebarWidth';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from './components/Header';
import { useMenuLayout } from './components/menu-layout-provider';
import TieredModuleTabs from './components/TieredModuleTabs';
import FlatModuleTabs from './components/FlatModuleTabs';
import ModuleSubTabs from './components/ModuleSubTabs';
import LoginPage from './components/LoginPage';
import ModuleContent from './components/ModuleContent';
import Sidebar from './components/Sidebar';
import { loadCompanyLangSettings } from '@/lib/companyLang';
import { LanguageContext } from '@/lib/i18nLoader';
import { useSysCodes } from '@/lib/sysCodeContext';
import { useSysGridColumnSettings } from '@/lib/sysGridColumnSettingContext';
import { useMenuTreeQuery } from '@/hooks/queries/useMenuTreeQuery';
import {
    filterVisibleMenuTree,
    findFirstMenuRoutePath,
    findMenuById,
    findOverviewMenu,
    getMenuPath,
    isOverviewPath,
} from '@/api/menuApi';
import { SHOW_DASHBOARD } from '@/lib/featureVisibility';
import { collectDescendantIds as collectFinanceDescendantIds, findFinanceTopMenu, flattenFinanceMenuForSidebar } from '@/lib/financeMenu';
import { collectDescendantIds as collectReportDescendantIds, findReportTopMenu, flattenReportMenuForSidebar } from '@/lib/reportMenu';
import { flattenFlatModuleMenusForSidebar, remapActiveMenuForFlatModules } from '@/lib/flatModuleMenus';
import { collectDescendantIds as collectMasterDataDescendantIds, findMasterDataTopMenu, flattenMasterDataMenuForSidebar } from '@/lib/masterDataMenu';
import {
    AUTH_SESSION_CHANGED_EVENT,
    buildAppPath,
    canRestoreSession,
    getCompanyCdFromPathname,
    getCurrentCompanyCd,
    getCurrentSession,
    getSession,
    isAuthenticated,
    logout,
    resolveDefaultCompanyCd,
    type AuthSession,
} from './lib/login';
import { getCurrentLang } from './utils/language';
import { clearFrontendCaches } from '@/lib/cacheManager';
import { MenuTreeNode } from './types/menu';
import { resolveMenuCaption } from '@/utils/resolveConfigCaption';
import { EtcType } from '@/api/systemApi';
import { isPublicAppPath } from '@/lib/publicRoutes';
import {
    normalizeWorkspaceHref,
    workspaceTabStatesMatch,
    WorkspaceTabBar,
    WorkspaceTabRouteProvider,
    WorkspaceTabsProvider,
    useWorkspaceTabsController,
} from '@/components/workspaceTabs/WorkspaceTabs';

const DashboardPage = lazy(() => import('./components/DashboardPage'));
const HelpSupportPage = lazy(() => import('./components/HelpSupportPage'));
const CompanyManagement = lazy(() => import('./pages/Module/CompanyManagement/CompanyInfo'));
const DebitNotePage = lazy(() => import('./pages/VoucherManagement/DebitNotePage'));
const CreditNotePage = lazy(() => import('./pages/VoucherManagement/CreditNotePage'));
const CashExchangeRateRecalculationPage = lazy(() => import('./pages/Accounting/CashExchangeRateRecalculationPage'));
const ExchangeRateRecalculationPage = lazy(() => import('./pages/Accounting/ExchangeRateRecalculationPage'));
const PaymentVoucherPage = lazy(() => import('./pages/VoucherManagement/PaymentVoucherPage'));
const ReceiptVoucherPage = lazy(() => import('./pages/VoucherManagement/ReceiptVoucherPage'));
const CostObjectPage = lazy(() => import('./pages/Module/DepartmentManagement'));
const BankManagementPage = lazy(() => import('./pages/Module/BankManagementPage/bankInfo'));
const CustomerExtPage = lazy(() => import('./pages/Module/CustomerManagementPage/CustomerExtPage'));
const ProductList = lazy(() => import('./pages/Module/ProductManagement/ProductPage'));
const ProductKindList = lazy(() => import('./pages/Module/ProductKindManagement/ProductKindPage'));
const StoreList = lazy(() => import('./pages/Module/StoreManagement/StorePage'));
const StoreKindList = lazy(() => import('./pages/Module/StoreKindManagement/StoreKindPage'));
const UserManagementPage = lazy(() => import('./pages/Module/UserManagementPage/userInfo'));
const ManagementInfoPage = lazy(() => import('./pages/Module/ManagementInfo/ManagementInfoPage'));
const AcclistPage = lazy(() => import('./pages/Module/AcclistManagement/AcclistPage'));
const ConfiguredReportViewer = lazy(() => import('./pages/Reports/ConfiguredReportViewer'));
const JournalReportPage = lazy(() => import('./pages/Reports/JournalReportPage'));
const ReportFormulaOptionsPage = lazy(() => import('./pages/Reports/ReportFormulaOptionsPage'));
const ProductUnitList = lazy(() => import('./pages/Module/ProductUnitManagement/ProductUnitPage'));
const InventoryIssueVoucherPage = lazy(() => import('./pages/Inventory/InventoryIssueVoucherPage'));
const InventoryReceiptVoucherPage = lazy(() => import('./pages/Inventory/InventoryReceiptVoucherPage'));
const InventoryAdjustVoucherPage = lazy(() => import('./pages/Inventory/InventoryAdjustVoucherPage'));
const InventoryOpeningPage = lazy(() => import('./pages/Inventory/Opening/InventoryOpeningPage'));
const InventoryValuationPage = lazy(() => import('./pages/Inventory/InventoryValuationPage'));
const OffsetVoucherPage = lazy(() => import('./pages/VoucherManagement/OffsetVoucherPage'));
const PurchaseVoucherPage = lazy(() => import('./pages/VoucherManagement/PurchaseVoucherPage'));
const PurchaseServiceVoucherPage = lazy(() => import('./pages/VoucherManagement/PurchaseServiceVoucherPage'));
const APPurchaseDiscountPage = lazy(() => import('./pages/VoucherManagement/APPurchaseDiscountPage'));
const APReturnGoodsPage = lazy(() => import('./pages/VoucherManagement/APReturnGoodsPage'));
const ARSaleDiscountPage = lazy(() => import('./pages/VoucherManagement/ARSaleDiscountPage'));
const ARSaleReturnPage = lazy(() => import('./pages/VoucherManagement/ARSaleReturnPage'));
const OtherVoucherPage = lazy(() => import('./pages/VoucherManagement/OtherVoucherPage'));
const ProfilePage = lazy(() => import('./pages/Profile/ProfilePage'));
const SalesVoucherPage = lazy(() => import('./pages/VoucherManagement/SalesVoucherPage'));
const OpeningBalanceSummaryPage = lazy(() => import('./pages/Module/OpeningBalance/OpeningBalanceSummary'));
const OpeningBalanceAccountPage = lazy(() => import('./pages/Module/OpeningBalance/OpeningBalanceAccount'));
const OpeningBalanceBankPage = lazy(() => import('./pages/Module/OpeningBalance/OpeningBalanceBank'));
const OpeningBalanceCustomerPage = lazy(() => import('./pages/Module/OpeningBalance/OpeningBalanceCustomer'));
const OpeningBalanceCostObjectPage = lazy(() => import('./pages/Module/OpeningBalance/OpeningBalanceCostObject'));
const PeriodLockPage = lazy(() => import('./pages/Module/ClosingMonth/PeriodLockPage'));
const FixedAssetPage = lazy(() => import('./pages/Module/FixedAssetManagement/FixedAssetPage'));
const EInvoiceManagePage = lazy(() => import('./pages/EInvoice/EInvoiceManagePage'));
const PitWithholdingPage = lazy(() => import('./pages/TaxWithholding/PitWithholdingPage'));
const PitIncomePayerSettingPage = lazy(() => import('./pages/TaxWithholding/PitIncomePayerSettingPage'));
const PitXslSettingPage = lazy(() => import('./pages/TaxWithholding/PitXslSettingPage'));
const PitXslDesignerPage = lazy(() => import('./pages/TaxWithholding/PitXslDesignerPage'));
const EInvoiceLookupPage = lazy(() => import('./pages/EInvoice/EInvoiceLookupPage'));
const PublicEInvoiceLookupPage = lazy(() => import('./pages/EInvoice/PublicEInvoiceLookupPage'));
const PublicEInvoiceMinuteLookupPage = lazy(() => import('./pages/EInvoice/PublicEInvoiceMinuteLookupPage'));
const EInvoiceDeclarationPage = lazy(() => import('./pages/EInvoice/EInvoiceDeclarationPage'));
const EInvoiceSettingPage = lazy(() => import('./pages/EInvoice/EInvoiceSettingPage'));
const EInvoiceTemplateDesignerPage = lazy(() => import('./pages/EInvoice/EInvoiceTemplateDesignerPage'));
const EInvoiceErrorNoticePage = lazy(() => import('./pages/EInvoice/EInvoiceErrorNoticePage'));
const EInvoiceMinutesPage = lazy(() => import('./pages/EInvoice/EInvoiceMinutesPage'));

function RouteLoading() {
    return (
        <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-gray-500">
            Loading...
        </div>
    );
}

function stripCompanyPath(pathname: string): string {
    const companyCd = getCompanyCdFromPathname(pathname);
    if (!companyCd) {
        return pathname;
    }

    return pathname.replace(/^\/app\/[^/]+/i, '') || '/';
}

function getActiveMenuFromPath(pathname: string, tree: MenuTreeNode[]): string {
    if (isOverviewPath(pathname)) {
        if (!SHOW_DASHBOARD) {
            return "";
        }
        return findOverviewMenu(tree)?.id ?? "";
    }

    const normalize = (path: string) => (path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path);
    const normalizedPath = normalize(pathname);
    const candidates: MenuTreeNode[] = [];

    const collectRoutes = (nodes: MenuTreeNode[]) => {
        for (const node of nodes) {
            if (node.routePath) {
                candidates.push(node);
            }
            if (node.children?.length) {
                collectRoutes(node.children);
            }
        }
    };

    collectRoutes(tree);

    let best: MenuTreeNode | null = null;
    let bestLength = -1;
    for (const candidate of candidates) {
        const routePath = normalize(candidate.routePath as string);
        if (
            normalizedPath === routePath
            || normalizedPath.startsWith(routePath + "/")
            || normalizedPath.startsWith(routePath)
        ) {
            if (routePath.length > bestLength) {
                best = candidate;
                bestLength = routePath.length;
            }
        }
    }

    return best ? best.id : "";
}

function PublicEInvoiceLookupRedirect() {
    const location = useLocation();
    const { taxCode } = useParams<{ taxCode: string }>();
    const targetPath = `/tra-cuu-einvoice-amnote${taxCode ? `/${encodeURIComponent(taxCode)}` : ""}${location.search}`;
    return <Navigate to={targetPath} replace />;
}

function PublicEInvoiceMinuteLookupRedirect() {
    const location = useLocation();
    const { taxCode } = useParams<{ taxCode: string }>();
    const targetPath = `/tra-cuu-bien-ban-amnote${taxCode ? `/${encodeURIComponent(taxCode)}` : ""}${location.search}`;
    return <Navigate to={targetPath} replace />;
}

function PublicLookupRoutes() {
    return (
        <Suspense fallback={<RouteLoading />}>
        <Routes>
            <Route path="/tra-cuu-einvoice-amnote" element={<PublicEInvoiceLookupPage />} />
            <Route path="/tra-cuu-einvoice-amnote/:taxCode" element={<PublicEInvoiceLookupPage />} />
            <Route path="/tra-cuu-bien-ban-amnote" element={<PublicEInvoiceMinuteLookupPage />} />
            <Route path="/tra-cuu-bien-ban-amnote/:taxCode" element={<PublicEInvoiceMinuteLookupPage />} />
            <Route path="/einvoice/lookup" element={<PublicEInvoiceLookupRedirect />} />
            <Route path="/einvoice/lookup/:taxCode" element={<PublicEInvoiceLookupRedirect />} />
            <Route path="/einvoice/minutes/lookup" element={<PublicEInvoiceMinuteLookupRedirect />} />
            <Route path="/einvoice/minutes/lookup/:taxCode" element={<PublicEInvoiceMinuteLookupRedirect />} />
        </Routes>
        </Suspense>
    );
}

function AppContent({ onLogout }: { onLogout: () => void }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
        if (typeof window === "undefined") {
            return true;
        }
        return window.localStorage.getItem('sidebar-collapsed') !== 'false';
    });
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const {
        sidebarRef,
        sidebarWidth,
        isResizing,
        beginResize,
        resetSidebarWidth,
    } = useSidebarWidth();

    const { translate } = useContext(LanguageContext) as {
        translate?: (key: string, fallback?: string) => string;
    };
    const t = useMemo(
        () => translate ?? ((key: string, fallback?: string) => fallback ?? key),
        [translate],
    );
    const { menuLayout, showWorkspaceBar, showHeaderMenuBar, setShowHeaderMenuBar } = useMenuLayout();
    const useHeaderTabs = menuLayout === "header";
    const willRenderHeaderTabs = useHeaderTabs && showHeaderMenuBar;
    const willRenderWorkspaceBar = !useHeaderTabs && showWorkspaceBar;
    // Hiding header tabs changes only their visibility. Keep the active route
    // inside its workspace tab so reports do not unmount and auto-fetch again.
    const workspaceTabsEnabled = useHeaderTabs || willRenderWorkspaceBar;
    const didAutoExpandSidebarRef = useRef(false);
    const navigate = useNavigate();
    const location = useLocation();
    const currentCompanyCd = getCompanyCdFromPathname(location.pathname);
    const {
        data: menuTree = [],
        isLoading: menuLoading,
    } = useMenuTreeQuery(currentCompanyCd ?? "");
    const loading = Boolean(currentCompanyCd) && menuLoading;
    const scopedPathname = stripCompanyPath(location.pathname);

    useEffect(() => {
        if (currentCompanyCd) {
            return;
        }

        const defaultCompanyCd = resolveDefaultCompanyCd();
        if (!defaultCompanyCd) {
            return;
        }

        const targetPath = location.pathname === "/login" ? "/" : location.pathname;
        // Keep query/hash when re-scoping under /app/{company} (e.g. after a relative navigate).
        navigate(
            {
                pathname: buildAppPath(defaultCompanyCd, targetPath),
                search: location.search,
                hash: location.hash,
            },
            { replace: true },
        );
    }, [currentCompanyCd, location.hash, location.pathname, location.search, navigate]);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [currentCompanyCd]);

    useEffect(() => {
        if (menuLayout !== "sidebar" || isMobile) {
            didAutoExpandSidebarRef.current = false;
            return;
        }

        if (didAutoExpandSidebarRef.current) {
            return;
        }

        didAutoExpandSidebarRef.current = true;
        setSidebarCollapsed(false);
        localStorage.setItem("sidebar-collapsed", "false");
    }, [isMobile, menuLayout]);

    const activeMenu = getActiveMenuFromPath(scopedPathname, menuTree);
    const currentMenuItem = findMenuById(menuTree, activeMenu);
    const currentMenuPath = activeMenu ? getMenuPath(menuTree, activeMenu) : null;
    const systemMenuNode =
        currentMenuPath && currentMenuPath.length > 0
            ? findMenuById(menuTree, currentMenuPath[0])
            : null;
    const visibleMenuTree = useMemo(
        () => filterVisibleMenuTree(menuTree),
        [menuTree],
    );
    const sidebarMenuTree = useMemo(
        () =>
            filterVisibleMenuTree(
                useHeaderTabs
                    ? flattenFlatModuleMenusForSidebar(
                        flattenReportMenuForSidebar(
                            flattenFinanceMenuForSidebar(
                                flattenMasterDataMenuForSidebar(menuTree),
                            ),
                        ),
                    )
                    : menuTree,
            ),
        [menuTree, useHeaderTabs],
    );
    const sidebarActiveMenu = useMemo(() => {
        if (!useHeaderTabs) {
            return activeMenu;
        }
        const masterDataNode = findMasterDataTopMenu(menuTree);
        if (masterDataNode && collectMasterDataDescendantIds(masterDataNode).has(activeMenu)) {
            return masterDataNode.id;
        }
        const financeNode = findFinanceTopMenu(menuTree);
        if (financeNode && collectFinanceDescendantIds(financeNode).has(activeMenu)) {
            return financeNode.id;
        }
        const reportNode = findReportTopMenu(menuTree);
        if (reportNode && collectReportDescendantIds(reportNode).has(activeMenu)) {
            return reportNode.id;
        }
        return remapActiveMenuForFlatModules(menuTree, activeMenu);
    }, [menuTree, activeMenu, useHeaderTabs]);
    const resolveWorkspaceMenu = useCallback((href: string) => {
        const pathname = new URL(href, window.location.origin).pathname;
        const menuId = getActiveMenuFromPath(stripCompanyPath(pathname), menuTree);
        return menuId ? findMenuById(menuTree, menuId) : null;
    }, [menuTree]);
    const getWorkspaceTabTitle = useCallback((href: string) => {
        const menuItem = resolveWorkspaceMenu(href);
        if (menuItem) {
            return resolveMenuCaption(menuItem, t);
        }

        const pathname = new URL(href, window.location.origin).pathname;
        if (SHOW_DASHBOARD && isOverviewPath(stripCompanyPath(pathname))) {
            return t("OVERVIEW", "Tổng quan");
        }

        if (stripCompanyPath(pathname) === "/report-viewer") {
            return t("REPORT", "Báo cáo");
        }

        const segments = pathname.split("/").filter(Boolean);
        return segments[segments.length - 1]?.replace(/[-_]+/g, " ") || t("WORKSPACE_TAB", "Màn hình");
    }, [resolveWorkspaceMenu, t]);
    const getWorkspaceTabIcon = useCallback((href: string) => {
        const menuItem = resolveWorkspaceMenu(href);
        if (menuItem?.icon) {
            return menuItem.icon;
        }

        const pathname = new URL(href, window.location.origin).pathname;
        if (SHOW_DASHBOARD && isOverviewPath(stripCompanyPath(pathname))) {
            return "home";
        }
        if (stripCompanyPath(pathname) === "/report-viewer") {
            return "print";
        }
        return "doc";
    }, [resolveWorkspaceMenu]);
    const resolveDefaultLandingHref = useCallback(() => {
        if (SHOW_DASHBOARD) {
            return buildAppPath(currentCompanyCd ?? "", "/");
        }

        const landingPath = findFirstMenuRoutePath(visibleMenuTree);
        return buildAppPath(currentCompanyCd ?? "", landingPath ?? "/");
    }, [currentCompanyCd, visibleMenuTree]);
    const workspaceTabs = useWorkspaceTabsController({
        companyCd: currentCompanyCd ?? "",
        enabled: workspaceTabsEnabled,
        getIcon: getWorkspaceTabIcon,
        getTitle: getWorkspaceTabTitle,
        location,
        navigate,
        resolveDefaultLandingHref,
    });

    useEffect(() => {
        if (SHOW_DASHBOARD || !currentCompanyCd || menuLoading) {
            return;
        }

        if (!isOverviewPath(scopedPathname)) {
            return;
        }

        const landingPath = findFirstMenuRoutePath(visibleMenuTree);
        if (!landingPath) {
            return;
        }

        navigate(buildAppPath(currentCompanyCd, landingPath), { replace: true });
    }, [currentCompanyCd, menuLoading, navigate, scopedPathname, visibleMenuTree]);

    useEffect(() => {
        if (isMobile) {
            setSidebarOpen(false);
        }
    }, [isMobile]);

    useEffect(() => {
        if (isMobile) {
            setSidebarOpen(false);
        }
    }, [scopedPathname, isMobile]);

    const handleLogout = () => {
        void (async () => {
            await logout();
            onLogout();
        })();
    };

    const handleMenuSelect = (menuItem: MenuTreeNode) => {
        if (useHeaderTabs) {
            setShowHeaderMenuBar(true);
        }
        if (menuItem.routePath) {
            const href = buildAppPath(currentCompanyCd || getCurrentCompanyCd() || resolveDefaultCompanyCd(), menuItem.routePath);
            if (workspaceTabsEnabled) {
                workspaceTabs.openWorkspaceScreen(href);
            } else {
                navigate(href);
            }
        }
        if (isMobile) {
            setSidebarOpen(false);
        }
    };

    const expandSidebar = () => {
        if (isMobile) {
            setSidebarOpen(true);
            return;
        }

        setSidebarCollapsed(false);
        localStorage.setItem('sidebar-collapsed', 'false');
    };

    const toggleSidebar = () => {
        if (isMobile) {
            setSidebarOpen(!sidebarOpen);
            return;
        }

        setSidebarCollapsed((previous) => {
            localStorage.setItem('sidebar-collapsed', !previous ? 'true' : 'false');
            return !previous;
        });
    };

    const closeSidebar = () => {
        if (isMobile) {
            setSidebarOpen(false);
        }
    };

    const browserHref = useMemo(
        () => normalizeWorkspaceHref(`${location.pathname}${location.search}${location.hash}`),
        [location.hash, location.pathname, location.search],
    );

    const renderedWorkspace = useMemo(() => {
        const tab = workspaceTabs.tabs.find(
            (item) =>
                normalizeWorkspaceHref(item.href) === browserHref
                && workspaceTabStatesMatch(location.state, item.state),
        ) ?? workspaceTabs.tabs.find((item) => item.id === workspaceTabs.activeTabId) ?? null;

        if (!tab) {
            return null;
        }

        const tabUrl = new URL(tab.href, window.location.origin);
        return {
            tab,
            location: {
                pathname: stripCompanyPath(tabUrl.pathname),
                search: tabUrl.search,
                hash: tabUrl.hash,
                state: tab.state,
                key: tab.id,
            },
        };
    }, [browserHref, location.state, workspaceTabs.activeTabId, workspaceTabs.tabs]);

    const workspaceScreen = workspaceTabsEnabled
        && renderedWorkspace
        && normalizeWorkspaceHref(renderedWorkspace.tab.href) === browserHref
        ? renderedWorkspace
        : null;

    const plainWorkspaceLocation = useMemo(
        () => ({
            pathname: stripCompanyPath(location.pathname),
            search: location.search,
            hash: location.hash,
            state: location.state,
            key: location.key,
        }),
        [location.hash, location.key, location.pathname, location.search, location.state],
    );

    return (
        <WorkspaceTabsProvider controller={workspaceTabs}>
        <div className="flex h-screen bg-gray-50 relative">
            {isMobile && sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={closeSidebar}
                />
            )}

            <div
                ref={sidebarRef}
                className={
                    isMobile
                        ? `fixed left-0 top-0 h-full z-50 transform transition-transform duration-300 ease-[cubic-bezier(.22,.68,.18,1)] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
                        : `relative flex-shrink-0 ${isResizing ? '' : 'transition-[width] duration-400 ease-[cubic-bezier(.22,.68,.18,1)]'}`
                }
                style={{
                    width: isMobile
                        ? SIDEBAR_DEFAULT_WIDTH
                        : (sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth),
                }}
            >
                <Sidebar
                    menuTree={sidebarMenuTree}
                    flyoutMenuTree={visibleMenuTree}
                    activeMenu={sidebarActiveMenu}
                    onMenuSelect={handleMenuSelect}
                    isCollapsed={!isMobile && sidebarCollapsed}
                    isMobile={isMobile}
                    loading={loading}
                    onRequestExpand={expandSidebar}
                />
                {!isMobile && !sidebarCollapsed ? (
                    <div
                        role="separator"
                        aria-orientation="vertical"
                        aria-label="Resize sidebar"
                        aria-valuenow={sidebarWidth}
                        aria-valuemin={SIDEBAR_MIN_WIDTH}
                        aria-valuemax={SIDEBAR_MAX_WIDTH}
                        className={`absolute inset-y-0 right-0 z-20 w-1.5 cursor-col-resize touch-none ${
                            isResizing ? 'bg-blue-400' : 'bg-transparent hover:bg-blue-300'
                        }`}
                        onPointerDown={(event) => {
                            event.preventDefault();
                            beginResize();
                        }}
                        onDoubleClick={resetSidebarWidth}
                    />
                ) : null}
                {!isMobile ? (
                    <button
                        type="button"
                        aria-label={
                            sidebarCollapsed
                                ? t('SIDEBAR_EXPAND', 'Mở rộng menu')
                                : t('SIDEBAR_COLLAPSE', 'Thu gọn menu')
                        }
                        title={
                            sidebarCollapsed
                                ? t('SIDEBAR_EXPAND', 'Mở rộng menu')
                                : t('SIDEBAR_COLLAPSE', 'Thu gọn menu')
                        }
                        onClick={toggleSidebar}
                        className="absolute top-1/2 right-0 z-30 flex h-7 w-7 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                    >
                        {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                ) : null}
            </div>

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <Header
                    onLogout={handleLogout}
                    currentMenuItem={currentMenuItem}
                    systemMenuNode={systemMenuNode}
                />

                {willRenderHeaderTabs ? (
                    <>
                        <ModuleSubTabs />
                        <TieredModuleTabs />
                        <FlatModuleTabs />
                    </>
                ) : willRenderWorkspaceBar ? (
                    <WorkspaceTabBar
                        activeTabId={workspaceTabs.activeTabId}
                        tabs={workspaceTabs.tabs}
                        onSelect={workspaceTabs.selectTab}
                        onClose={workspaceTabs.closeTab}
                        onCloseAll={workspaceTabs.closeAllTabs}
                        onCloseOthers={workspaceTabs.closeOtherTabs}
                    />
                ) : null}

                <main className="relative min-h-0 flex-1 overflow-hidden">
                    {workspaceScreen ? (
                        <div className="absolute inset-0 overflow-auto p-1.5">
                            <WorkspaceTabRouteProvider tab={workspaceScreen.tab}>
                                <MemoAppWorkspaceRoutes
                                    key={workspaceScreen.tab.id}
                                    tabLocation={workspaceScreen.location}
                                    currentCompanyCd={currentCompanyCd ?? ""}
                                    resolveDefaultLandingHref={resolveDefaultLandingHref}
                                />
                            </WorkspaceTabRouteProvider>
                        </div>
                    ) : (
                        <div className="absolute inset-0 overflow-auto p-1.5">
                            <MemoAppWorkspaceRoutes
                                tabLocation={plainWorkspaceLocation}
                                currentCompanyCd={currentCompanyCd ?? ""}
                                resolveDefaultLandingHref={resolveDefaultLandingHref}
                            />
                        </div>
                    )}
                </main>
            </div>
        </div>
        </WorkspaceTabsProvider>
    );
}

function AppWorkspaceRoutes({
    tabLocation,
    currentCompanyCd,
    resolveDefaultLandingHref,
}: {
    tabLocation: {
        pathname: string;
        search: string;
        hash: string;
        state: unknown;
        key: string;
    };
    currentCompanyCd: string;
    resolveDefaultLandingHref: () => string;
}) {
    return (
        <Suspense fallback={<RouteLoading />}>
                    <Routes location={tabLocation}>
                        <Route
                            path="/"
                            element={SHOW_DASHBOARD ? <DashboardPage /> : null}
                        />
                        <Route
                            path="/dashboard"
                            element={
                                <Navigate
                                    to={SHOW_DASHBOARD ? buildAppPath(currentCompanyCd, "/") : resolveDefaultLandingHref()}
                                    replace
                                />
                            }
                        />
                        <Route path="/cost-center" element={<Navigate to={buildAppPath(currentCompanyCd, "/master/cost-center")} replace />} />
                        <Route path="/master/cost-center" element={<CostObjectPage />} />
                        <Route path="/bank-management" element={<BankManagementPage />} />
                        <Route path="/master/bank" element={<BankManagementPage />} />
                        <Route path="/company" element={<CompanyManagement />} />
                        <Route path="/master/company" element={<CompanyManagement />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/help-support" element={<HelpSupportPage />} />
                      <Route path="/master/user" element={<UserManagementPage />} />
                        <Route path="/customer-management" element={<Navigate to={buildAppPath(currentCompanyCd, "/master/customer")} replace />} />
                        <Route path="/master/customer" element={<CustomerExtPage />} />
                        <Route path="/code-registration" element={<ModuleContent moduleId="code-registration" />} />
                        <Route path="/account-management" element={<ModuleContent moduleId="account-management" />} />
                       <Route path="/warehouse-category" element={<ModuleContent moduleId="warehouse-category" />} />
                        <Route path="/master/account" element={<AcclistPage />} />
                        <Route path="/master/inventory" element={<ProductList />} />
                        <Route path="/master/product-group" element={<ProductKindList />} />
                        <Route path="/master/unit" element={<ProductUnitList />} />
                        <Route path="/master/warehouse" element={<StoreList />} />
                        <Route path="/master/warehouse-type" element={<StoreKindList />} />
                        <Route path="/master/management" element={<ManagementInfoPage />} />
                        <Route path="/unit-management" element={<ProductUnitList />} />
                        <Route path="/standard-management" element={<ModuleContent moduleId="standard-management" />} />
                        <Route path="/note-management" element={<ModuleContent moduleId="note-management" />} />
                        <Route path="/contract-management" element={<ModuleContent moduleId="contract-management" />} />
                        <Route path="/journal" element={<ModuleContent moduleId="journal" />} />
                        <Route path="/cash" element={<ModuleContent moduleId="cash" />} />

                        <Route path="/cash/payment" element={<PaymentVoucherPage />} />
                        <Route path="/gl/voucher/payment" element={<PaymentVoucherPage />} />
                        <Route path="/gl/voucher/receipt" element={<ReceiptVoucherPage />} />
                        <Route path="/cash/receipt" element={<ReceiptVoucherPage />} />
                        <Route path="/gl/voucher/debit-note" element={<DebitNotePage />} />
                        <Route path="/bank/debit-note" element={<DebitNotePage />} />
                        <Route path="/gl/voucher/credit-note" element={<CreditNotePage />} />
                        <Route path="/bank/credit-note" element={<CreditNotePage />} />
                        <Route path="/gl/voucher/offset" element={<OffsetVoucherPage />} />
                        <Route path="/inventory/receipt" element={<InventoryReceiptVoucherPage />} />
                        <Route path="/inventory/issue" element={<InventoryIssueVoucherPage />} />
                        <Route path="/inventory/adjust" element={<InventoryAdjustVoucherPage />} />
                        <Route path="/inventory/opening" element={<InventoryOpeningPage />} />
                        <Route path="/inventory/calc-out-price" element={<InventoryValuationPage />} />
                        <Route path="/gl/voucher/purchase" element={<PurchaseVoucherPage />} />
                        <Route path="/ap/purchase/goods" element={<PurchaseVoucherPage />} />
                        <Route path="/gl/voucher/purchase-service" element={<PurchaseServiceVoucherPage />} />
                        <Route path="/ap/purchase/purchase-service" element={<PurchaseServiceVoucherPage />} />
                        <Route path="/ap/purchase/discount" element={<APPurchaseDiscountPage />} />
                        <Route path="/ap/purchase/return" element={<APReturnGoodsPage />} />
                        <Route path="/gl/voucher/sale" element={<SalesVoucherPage />} />
                        <Route path="/ar/sale" element={<SalesVoucherPage />} />
                        <Route path="/ar/sale/discount" element={<ARSaleDiscountPage />} />
                        <Route path="/ar/sale/return" element={<ARSaleReturnPage />} />
                        <Route path="/gl/voucher/other" element={<OtherVoucherPage />} />
                        <Route
                            path="/ar/report/sales-journal"
                            element={<JournalReportPage reportCode="AR_SALES_JOURNAL" menuCode="AR_REPORT_SALES_JOURNAL" titleKey="AR_SALES_JOURNAL" titleFallback="Sổ nhật ký bán hàng" showExportExcel={true} exportFilePrefix="sales_journal" exportSheetName="SalesJournal" />}
                        />
                        <Route
                            path="/ar/report/sales-detail"
                            element={<JournalReportPage reportCode="AR_SALES_DETAIL" menuCode="AR_REPORT_SALES_DETAIL" titleKey="AR_SALES_DETAIL" titleFallback="Sổ chi tiết bán hàng" showExportExcel={true} exportFilePrefix="sales_detail" exportSheetName="SalesDetail" />}
                        />
                        <Route
                            path="/gl/book/sales-journal"
                            element={<JournalReportPage reportCode="AR_SALES_JOURNAL" menuCode="GL_BOOK_SALES_JOURNAL" titleKey="AR_SALES_JOURNAL" titleFallback="Sổ nhật ký bán hàng" showExportExcel={true} exportFilePrefix="sales_journal" exportSheetName="SalesJournal" />}
                        />
                        <Route
                            path="/gl/book/sales-detail"
                            element={<JournalReportPage reportCode="AR_SALES_DETAIL" menuCode="GL_BOOK_SALES_DETAIL" titleKey="AR_SALES_DETAIL" titleFallback="Sổ nhật ký bán hàng" showExportExcel={true} exportFilePrefix="sales_detail" exportSheetName="SalesDetail" />}
                        />
                        <Route
                            path="/ap/report/purchase-journal"
                            element={<JournalReportPage reportCode="AP_PURCHASE_JOURNAL" menuCode="AP_REPORT_PURCHASE_JOURNAL" titleKey="AP_PURCHASE_JOURNAL" titleFallback="Sổ nhật ký mua hàng" showExportExcel={true} exportFilePrefix="purchase_journal" exportSheetName="PurchaseJournal" />}
                        />
                        <Route
                            path="/gl/book/purchase-journal"
                            element={<JournalReportPage reportCode="AP_PURCHASE_JOURNAL" menuCode="AP_REPORT_PURCHASE_JOURNAL" titleKey="AP_PURCHASE_JOURNAL" titleFallback="Sổ nhật ký mua hàng" showExportExcel={true} exportFilePrefix="purchase_journal" exportSheetName="PurchaseJournal" />}
                        />
                        <Route
                            path="/gl/book/general-journal"
                            element={<JournalReportPage reportCode="GL_GENERAL_JOURNAL" menuCode="GL_BOOK_JOURNAL" titleKey="GL_GENERAL_JOURNAL" titleFallback="Sổ nhật ký chung" showExportExcel={true} exportFilePrefix="general_journal" exportSheetName="GeneralJournal" />}
                        />
                        <Route
                            path="/gl/book/general-ledger"
                            element={<JournalReportPage reportCode="GL_GENERAL_LEDGER_S02C1DN" menuCode="GL_BOOK_LEDGER" titleKey="GL_GENERAL_LEDGER_S02C1DN" titleFallback="Sổ cái tài khoản" showAccountFilter={true} showExportExcel={true} exportFilePrefix="general_ledger" exportSheetName="GeneralLedger" />}
                        />
                        <Route
                            path="/gl/book/account-detail"
                            element={<JournalReportPage reportCode="GL_ACCOUNT_DETAIL_S38DN" menuCode="GL_BOOK_ACC_DETAIL" titleKey="GL_ACCOUNT_DETAIL_S38DN" titleFallback="Sổ chi tiết tài khoản" showAccountFilter={true} showCurrencyFilter={true} showExportExcel={true} includeEmptyFilterParams={true} exportFilePrefix="account_detail_book" exportSheetName="AccountDetail" moduleCd="" />}
                        />
                        <Route
                            path="/gl/book/ar-detail"
                            element={<JournalReportPage reportCode="GL_AR_DETAIL_S31DN" menuCode="GL_BOOK_AR_DETAIL" titleKey="GL_AR_DETAIL_S31DN" titleFallback="Sổ chi tiết công nợ" showAccountFilter={true} accountFilterEtcType={EtcType.cbxArBookAccount} showCustomerFilter={true} showCurrencyFilter={true} showExportExcel={true} includeEmptyFilterParams={true} exportFilePrefix="ar_detail_book" exportSheetName="ARDetail" moduleCd="" />}
                        />
                        <Route
                            path="/gl/book/ar-summary"
                            element={<JournalReportPage reportCode="GL_AR_SUMMARY_S31DN" menuCode="GL_BOOK_AR_SUM" titleKey="GL_AR_SUMMARY_S31DN" titleFallback="Sổ tổng hợp công nợ" showAccountFilter={true} accountFilterEtcType={EtcType.cbxArBookAccount} showCustomerFilter={true} showCurrencyFilter={true} showExportExcel={true} includeEmptyFilterParams={true} exportFilePrefix="ar_summary_book" exportSheetName="ARSummary" moduleCd="" />}
                        />
                        <Route
                            path="/gl/book/ar-aging"
                            element={<JournalReportPage reportCode="GL_AR_AGING" menuCode="GL_BOOK_AR_AGING" titleKey="GL_AR_AGING" titleFallback="Phân tích công nợ phải thu theo tuổi nợ" showAccountFilter={true} showCustomerFilter={true} showCurrencyFilter={true} showExportExcel={true} includeEmptyFilterParams={true} exportFilePrefix="ar_aging" exportSheetName="ARAging" moduleCd="" />}
                        />
                        <Route
                            path="/gl/book/ar-aging-detail"
                            element={<JournalReportPage reportCode="GL_AR_AGING_DETAIL" menuCode="GL_BOOK_AR_AGING_DETAIL" titleKey="GL_AR_AGING_DETAIL" titleFallback="Chi tiết công nợ phải thu theo tuổi nợ" showAccountFilter={true} showCustomerFilter={true} showCurrencyFilter={true} showExportExcel={true} includeEmptyFilterParams={true} exportFilePrefix="ar_aging_detail" exportSheetName="ARAgingDetail" moduleCd="" />}
                        />
                        <Route
                            path="/gl/book/management-code"
                            element={<JournalReportPage reportCode="GL_MANAGEMENT_CODE_BOOK" menuCode="GL_BOOK_MNG_REPORT" titleKey="GL_MANAGEMENT_CODE_BOOK" titleFallback="Sổ chi tiết mã quản lý" showAccountFilter={true} accountFilterEtcType={EtcType.cbxAccountParentChild} showExportExcel={true} includeEmptyFilterParams={true} exportFilePrefix="management_code_book" exportSheetName="ManagementCode" />}
                        />
                        <Route
                            path="/gl/book/pl-by-object"
                            element={<JournalReportPage reportCode="GL_PL_BY_OBJECT" menuCode="GL_BOOK_PL_OBJ" titleKey="GL_PL_BY_OBJECT" titleFallback="Báo cáo lãi lỗ chi tiết theo đối tượng" showExportExcel={true} exportFilePrefix="pl_by_object" exportSheetName="PLByObject" />}
                        />
                        <Route
                            path="/gl/book/pl-summary"
                            element={<JournalReportPage reportCode="GL_PL_SUMMARY" menuCode="GL_BOOK_PL_SUM" titleKey="GL_PL_SUMMARY" titleFallback="Báo cáo lãi lỗ tổng hợp" showExportExcel={true} exportFilePrefix="pl_summary" exportSheetName="PLSummary" />}
                        />
                        <Route
                            path="/gl/book/trial-balance"
                            element={<JournalReportPage reportCode="GL_TRIAL_BALANCE_S06DN" menuCode="GL_BOOK_TRIAL" titleKey="GL_TRIAL_BALANCE_S06DN" titleFallback="Bảng cân đối số phát sinh" showExportExcel={true} exportFilePrefix="trial_balance" exportSheetName="TrialBalance" />}
                        />
                        <Route
                            path="/gl/fs/balance-sheet"
                            element={<JournalReportPage reportCode="GL_BALANCE_SHEET_B01DN" menuCode="GL_FS_BALANCE" titleKey="GL_BALANCE_SHEET_B01DN" titleFallback="Bảng cân đối kế toán" reportVersion="2025" unitDivisor="1" showExportExcel={true} exportFilePrefix="balance_sheet" exportSheetName="BalanceSheet" />}
                        />
                        <Route
                            path="/gl/fs/profit-loss"
                            element={<JournalReportPage reportCode="GL_PROFIT_LOSS_B02DN" menuCode="GL_FS_PL" titleKey="GL_PROFIT_LOSS_B02DN" titleFallback="Báo cáo kết quả hoạt động kinh doanh" reportVersion="2025" unitDivisor="1" showExportExcel={true} exportFilePrefix="profit_loss" exportSheetName="ProfitLoss" />}
                        />
                        <Route
                            path="/gl/fs/pl-period"
                            element={<JournalReportPage reportCode="GL_PROFIT_LOSS_B02DNTT" menuCode="GL_PROFIT_LOSS_B02DNTT" titleKey="GL_PROFIT_LOSS_B02DNTT" titleFallback="Báo cáo kết quả kinh doanh theo kỳ" reportVersion="2025" unitDivisor="1" showExportExcel={true} exportFilePrefix="profit_loss_period" exportSheetName="ProfitLossPeriod" />}
                        />
                        <Route
                            path="/gl/fs/cashflow"
                            element={<JournalReportPage reportCode="GL_CASHFLOW_B03DN_TT" menuCode="GL_FS_CASHFLOW" titleKey="GL_CASHFLOW_B03DN" titleFallback="Báo cáo lưu chuyển tiền tệ" reportVersion="2025" unitDivisor="1" reportOptionGroupCode="GL_FS_CASHFLOW" showExportExcel={true} exportFilePrefix="cashflow" exportSheetName="Cashflow" />}
                        />
                        <Route
                            path="/inventory/report/detail-product"
                            element={<JournalReportPage reportCode="INVENTORY_DETAIL_BOOK" menuCode="INV_REPORT_DETAIL_PRODUCT" titleKey="INV_REPORT_DETAIL_BOOK" titleFallback="Sổ chi tiết vật liệu, dụng cụ (sản phẩm, hàng hóa)" accountCd="156" showExportExcel={true} exportFilePrefix="inventory_detail_book" exportSheetName="InventoryDetail" />}
                        />
                        <Route
                            path="/inventory/report/detail-department"
                            element={<JournalReportPage reportCode="INVENTORY_DETAIL_BOOK" menuCode="INV_REPORT_DETAIL_DEPT" titleKey="INV_REPORT_DETAIL_BOOK" titleFallback="Sổ chi tiết vật liệu, dụng cụ (sản phẩm, hàng hóa)" accountCd="152" showExportExcel={true} exportFilePrefix="inventory_detail_book" exportSheetName="InventoryDetail" />}
                        />
                        <Route
                            path="/inventory/report/detail-account"
                            element={<JournalReportPage reportCode="INVENTORY_DETAIL_BOOK" menuCode="INV_REPORT_DETAIL_ACCOUNT" titleKey="INV_REPORT_DETAIL_BOOK" titleFallback="Sổ chi tiết vật liệu, dụng cụ (sản phẩm, hàng hóa)" accountCd="153" showExportExcel={true} exportFilePrefix="inventory_detail_book" exportSheetName="InventoryDetail" />}
                        />
                        <Route
                            path="/inventory/report/detail-store"
                            element={<JournalReportPage reportCode="INVENTORY_DETAIL_BOOK" menuCode="INV_REPORT_DETAIL_STORE" titleKey="INV_REPORT_DETAIL_BOOK" titleFallback="Sổ chi tiết vật liệu, dụng cụ (sản phẩm, hàng hóa)" accountCd="155" showExportExcel={true} exportFilePrefix="inventory_detail_book" exportSheetName="InventoryDetail" />}
                        />
                        <Route
                            path="/inventory/report/quantity"
                            element={<JournalReportPage reportCode="INVENTORY_QUANTITY_REPORT" menuCode="INV_REPORT_QUANTITY" titleKey="INVENTORY_QUANTITY_REPORT" titleFallback="Số lượng tồn kho" showWarehouseFilter={true} showProductFilter={true} showExportExcel={true} includeEmptyFilterParams={true} exportFilePrefix="inventory_quantity" exportSheetName="InventoryQuantity" reportOptionGroupCode="INV_REPORT_QUANTITY" />}
                        />
                        <Route
                            path="/inventory/report/source-doc"
                            element={<JournalReportPage reportCode="INVENTORY_SOURCE_DOCUMENT_REPORT" menuCode="INV_REPORT_SOURCE_DOC" titleKey="INVENTORY_SOURCE_DOCUMENT_REPORT" titleFallback="Bảng tổng hợp chứng từ gốc của hàng tồn kho" showWarehouseFilter={true} showProductFilter={true} showExportExcel={true} includeEmptyFilterParams={true} exportFilePrefix="inventory_source_document" exportSheetName="InventorySourceDocument" />}
                        />

                        <Route
                            path="/bank/bank-book"
                            element={<JournalReportPage reportCode="BANK_DEPOSIT_BOOK" menuCode="BA_BANK_BOOK" titleKey="BANK_DEPOSIT_BOOK" titleFallback="Sổ tiền gửi ngân hàng" showAccountFilter={true} accountLookupMode="parentChild" accountFilterEtcType={EtcType.cbxBankDepositBookAccount} showBankFilter={true} showCurrencyFilter={true} showExportExcel={true} includeEmptyFilterParams={true} exportFilePrefix="bank_deposit_book" exportSheetName="BankBook" moduleCd="" />}
                        />
                        <Route
                            path="/gl/book/bank"
                            element={<JournalReportPage reportCode="BANK_DEPOSIT_BOOK" menuCode="BA_BANK_BOOK" titleKey="BANK_DEPOSIT_BOOK" titleFallback="Sổ tiền gửi ngân hàng" showAccountFilter={true} accountLookupMode="parentChild" accountFilterEtcType={EtcType.cbxBankDepositBookAccount} showBankFilter={true} showCurrencyFilter={true} showExportExcel={true} includeEmptyFilterParams={true} exportFilePrefix="bank_deposit_book" exportSheetName="BankBook" moduleCd="" />}
                        />
                        <Route path="/bank/revalue" element={<ExchangeRateRecalculationPage />} />
                        <Route
                            path="/gl/book/cash"
                            element={<JournalReportPage reportCode="CASH_BOOK" menuCode="CA_CASH_BOOK" titleKey="CASH_BOOK" titleFallback="Sổ quỹ tiền mặt" showAccountFilter={true} accountLookupMode="parentChild" accountFilterEtcType={EtcType.cbxCashBookAccount} showCurrencyFilter={true} showExportExcel={true} includeEmptyFilterParams={true} exportFilePrefix="cash_book" exportSheetName="CashBook" moduleCd="" />}
                        />
                        <Route
                            path="/cash/cash-book"
                            element={<JournalReportPage reportCode="CASH_BOOK" menuCode="CA_CASH_BOOK" titleKey="CASH_BOOK" titleFallback="Sổ quỹ tiền mặt" showAccountFilter={true} accountLookupMode="parentChild" accountFilterEtcType={EtcType.cbxCashBookAccount} showCurrencyFilter={true} showExportExcel={true} includeEmptyFilterParams={true} exportFilePrefix="cash_book" exportSheetName="CashBook" moduleCd="" />}
                        />
                        <Route path="/cash/revalue" element={<CashExchangeRateRecalculationPage />} />
                        <Route path="/banking" element={<ModuleContent moduleId="banking" />} />
                        <Route path="/purchasing" element={<ModuleContent moduleId="purchasing" />} />
                        <Route path="/sales" element={<ModuleContent moduleId="sales" />} />
                        <Route path="/costing" element={<ModuleContent moduleId="costing" />} />
                        <Route path="/inventory" element={<ModuleContent moduleId="inventory" />} />
                        <Route path="/vat" element={<ModuleContent moduleId="vat" />} />
                        <Route
                            path="/tax/vat/inout-list"
                            element={
                                <JournalReportPage
                                    reportCode="TAX_VAT_INOUT_LIST"
                                    menuCode="TAX_VAT_INOUT_LIST"
                                    titleKey="TAX_VAT_INOUT_LIST"
                                    titleFallback="Danh sách hóa đơn đầu vào/đầu ra"
                                    showInvoiceTypeFilter={true}
                                    showInvoiceStatusFilter={true}
                                    showExportExcel={true}
                                    showFetchFromGdt={true}
                                    includeEmptyFilterParams={true}
                                    exportFilePrefix="vat_inout_list"
                                    exportSheetName="VatInOutList"
                                />
                            }
                        />
                        <Route
                            path="/tax/vat/invoice-list"
                            element={<JournalReportPage reportCode="TAX_VAT_INVOICE_LIST" menuCode="VAT_INVOICE_LIST" titleKey="VAT_INVOICE_LIST" titleFallback="Bảng kê hóa đơn, chứng từ hàng hóa, dịch vụ bán ra" showExportExcel={true} exportFilePrefix="vat_invoice_list" exportSheetName="VatInvoiceList" />}
                        />
                        <Route
                            path="/tax/vat/allocation"
                            element={<JournalReportPage reportCode="TAX_VAT_ALLOCATION" menuCode="VAT_ALLOCATION" titleKey="VAT_ALLOCATION" titleFallback="Bảng phân bổ số thuế giá trị gia tăng" showExportExcel={true} exportFilePrefix="vat_allocation" exportSheetName="VatAllocation" />}
                        />
                        <Route
                            path="/tax/vat/reduction-appendix"
                            element={<JournalReportPage reportCode="TAX_VAT_REDUCTION_APPENDIX" menuCode="VAT_REDUCTION_APPENDIX" titleKey="VAT_REDUCTION_APPENDIX" titleFallback="Phụ lục giảm thuế giá trị gia tăng" showInvoiceStatusFilter={true} showInvoiceKindFilter={true} showCurrencyFilter={true} includeEmptyFilterParams={true} showExportExcel={true} exportFilePrefix="vat_reduction_appendix" exportSheetName="VatReductionAppendix" />}
                        />
                        <Route path="/assets" element={<ModuleContent moduleId="assets" />} />
                        <Route path="/invoices" element={<ModuleContent moduleId="invoices" />} />
                        <Route path="/einvoice/manage" element={<EInvoiceManagePage key="standard" />} />
                        <Route path="/pit-withholding/declaration" element={<PitWithholdingPage key="pit-declaration" kind="declaration" />} />
                        <Route path="/pit-withholding/certificate" element={<PitWithholdingPage key="pit-certificate" kind="certificate" />} />
                        <Route path="/pit-withholding/error-notice" element={<PitWithholdingPage key="pit-error" kind="error-notice" />} />
                        <Route path="/pit-withholding/income-payer-setting" element={<PitIncomePayerSettingPage />} />
                        <Route path="/pit-withholding/xsl-setting" element={<PitXslSettingPage />} />
                        <Route path="/pit-withholding/xsl-setting/designer" element={<PitXslDesignerPage />} />
                        <Route path="/einvoice/mtt" element={<EInvoiceManagePage key="mtt" cashRegister />} />
                        <Route path="/einvoice/lookup" element={<EInvoiceLookupPage />} />
                        <Route path="/einvoice/declaration" element={<EInvoiceDeclarationPage />} />
                        <Route path="/einvoice/setting/designer" element={<EInvoiceTemplateDesignerPage />} />
                        <Route path="/einvoice/setting" element={<EInvoiceSettingPage />} />
                        <Route path="/einvoice/error-notice" element={<EInvoiceErrorNoticePage />} />
                        <Route path="/einvoice/minutes" element={<EInvoiceMinutesPage />} />
                        <Route
                            path="/einvoice/report"
                            element={<JournalReportPage reportCode="EINV_REPORT" menuCode="EINV_REPORT" titleKey="EINV_REPORT" titleFallback="Báo cáo hóa đơn" showExportExcel={true} exportFilePrefix="einvoice_report" exportSheetName="EInvoiceReport" />}
                        />
                        <Route
                            path="/tax/vat/declaration"
                            element={
                                <JournalReportPage
                                    reportCode="TAX_VAT_DECLARATION"
                                    menuCode="VAT_DECLARATION"
                                    titleKey="VAT_DECLARATION"
                                    titleFallback="Tờ khai thuế GTGT"
                                    reportVersion="2025"
                                    unitDivisor="1"
                                    showExportExcel={true}
                                    exportFilePrefix="vat_declaration"
                                    exportSheetName="VatDeclaration"
                                />
                            }
                        />
                        <Route
                            path="/tax/vat/inout-list"
                            element={
                                <JournalReportPage
                                    reportCode="TAX_VAT_INOUT_LIST"
                                    menuCode="VAT_INOUT_LIST"
                                    titleKey="VAT_INOUT_LIST"
                                    titleFallback="Danh sách hóa đơn mua vào/ bán ra"
                                    showInvoiceTypeFilter={true}
                                    showInvoiceStatusFilter={true}
                                    showExportExcel={true}
                                    includeEmptyFilterParams={true}
                                    exportFilePrefix="vat_inout_list"
                                    exportSheetName="VatInOut"
                                />
                            }
                        />
                        <Route path="/reports" element={<ModuleContent moduleId="reports" />} />
                        <Route path="/firmbanking" element={<ModuleContent moduleId="firmbanking" />} />
                        <Route path="/e-documents" element={<ModuleContent moduleId="e-documents" />} />
                        <Route path="/utilities" element={<ModuleContent moduleId="utilities" />} />
               
                        <Route path="/payment" element={<ModuleContent moduleId="payment" />} />
                        <Route path="/debt-note" element={<Navigate to={buildAppPath(currentCompanyCd, "/bank/debit-note")} replace />} />
                        <Route path="/credit-note" element={<Navigate to={buildAppPath(currentCompanyCd, "/bank/credit-note")} replace />} />
                        <Route path="/purchase-order" element={<Navigate to={buildAppPath(currentCompanyCd, "/gl/voucher/purchase")} replace />} />
                        <Route path="/service-order" element={<ModuleContent moduleId="service-order" />} />
                        <Route path="/sales-order" element={<ModuleContent moduleId="sales-order" />} />
                        <Route path="/offset-order" element={<ModuleContent moduleId="offset-order" />} />
                        <Route path="/other-order" element={<ModuleContent moduleId="other-order" />} />

                        <Route path="/gl/opening-balance" element={<OpeningBalanceSummaryPage />} />
                        <Route path="/gl/opening-balance/account" element={<OpeningBalanceAccountPage />} />
                        <Route path="/gl/opening-balance/customer" element={<OpeningBalanceCustomerPage />} />
                        <Route path="/gl/opening-balance/bank" element={<OpeningBalanceBankPage />} />
                        <Route path="/gl/opening-balance/cost-object" element={<OpeningBalanceCostObjectPage />} />

                        <Route path="/gl/vat-carry-forward" element={<ModuleContent moduleId="vat-carry-forward" />} />
                        <Route path="/gl/closing-balance" element={<PeriodLockPage />} />

                        <Route path="/transfer" element={<ModuleContent moduleId="transfer" />} />
                        <Route path="/check-transfer" element={<ModuleContent moduleId="check-transfer" />} />

                        <Route
                            path="/fa/report/depreciation"
                            element={
                                <JournalReportPage
                                    reportCode="FA_DEPRECIATION_REPORT"
                                    menuCode="FA_REPORT_DEPRECIATION"
                                    titleKey="FA_DEPRECIATION_REPORT"
                                    titleFallback="Bảng tính khấu hao TSCĐ"
                                    useUseStartYmdFilter={true}
                                    showAccountFilter={true}
                                    accountFilterEtcType={EtcType.cbxFixedAssetAccount}
                                    accountQueryParamKey="accCd"
                                    showAssetStatusFilter={true}
                                    showExportExcel={true}
                                    includeEmptyFilterParams={true}
                                    exportFilePrefix="fa_depreciation"
                                    exportSheetName="FADepreciation"
                                />
                            }
                        />
                        <Route
                            path="/fa/report/asset-book"
                            element={
                                <JournalReportPage
                                    reportCode="FA_ASSET_BOOK_REPORT"
                                    menuCode="FA_REPORT_ASSET_BOOK"
                                    titleKey="FA_ASSET_BOOK_REPORT"
                                    titleFallback="Sổ tài sản cố định"
                                    useUseStartYmdFilter={true}
                                    showAccountFilter={true}
                                    accountFilterEtcType={EtcType.cbxFixedAssetAccount}
                                    accountQueryParamKey="accCd"
                                    showAssetStatusFilter={true}
                                    showExportExcel={true}
                                    includeEmptyFilterParams={true}
                                    exportFilePrefix="fa_asset_book"
                                    exportSheetName="FAAssetBook"
                                />
                            }
                        />
                        <Route
                            path="/fa/report/depreciation-period"
                            element={
                                <JournalReportPage
                                    reportCode="FA_DEPRECIATION_PERIOD_REPORT"
                                    menuCode="FA_REPORT_DEPRECIATION_PERIOD"
                                    titleKey="FA_DEPRECIATION_PERIOD_REPORT"
                                    titleFallback="Bảng khấu hao TSCĐ theo kỳ"
                                    useUseStartYmdFilter={true}
                                    showAccountFilter={true}
                                    accountFilterEtcType={EtcType.cbxFixedAssetAccount}
                                    accountQueryParamKey="accCd"
                                    showAssetStatusFilter={true}
                                    showExportExcel={true}
                                    includeEmptyFilterParams={true}
                                    exportFilePrefix="fa_depreciation_period"
                                    exportSheetName="FADepreciationPeriod"
                                />
                            }
                        />
                        <Route path="/fa/register" element={<FixedAssetPage />} />

                        <Route path="/report-viewer" element={<ConfiguredReportViewer />} />
                        <Route path="/reports/formula-options" element={<ReportFormulaOptionsPage />} />
                        <Route path="*" element={<ModuleFallback />} />
                    </Routes>
        </Suspense>
    );
}

const MemoAppWorkspaceRoutes = memo(AppWorkspaceRoutes);

function ModuleFallback() {
    const location = useLocation();
    const rawPath = stripCompanyPath(location.pathname).replace(/^\/+|\/+$/g, '');
    const moduleId = rawPath.replace(/\//g, '-') || 'dashboard';
    return <ModuleContent moduleId={moduleId} />;
}

function AuthenticatedApp() {
    const [isLoggedIn, setIsLoggedIn] = useState(() => isAuthenticated());
    const [authLoading, setAuthLoading] = useState(true);
    const { refreshLabels } = useContext(LanguageContext) as { refreshLabels?: (lang?: string) => Promise<void> };
    const { clearGridColumnSettings, refreshGridColumnSettings } = useSysGridColumnSettings();
    const { clearSysCodes, refreshSysCodes } = useSysCodes();

    useEffect(() => {
        let mounted = true;

        const bootstrapSession = async () => {
            let authenticated = false;

            try {
                if (!canRestoreSession()) {
                    if (mounted) {
                        setIsLoggedIn(false);
                    }
                    return;
                }

                const session = await getSession();
                authenticated = Boolean(session?.isAuthenticated);

                if (!mounted) {
                    return;
                }

                setIsLoggedIn(authenticated);
                if (authenticated) {
                    const preloadTasks: Promise<unknown>[] = [
                        refreshGridColumnSettings(true),
                        refreshSysCodes(),
                        loadCompanyLangSettings(getCurrentCompanyCd(), true),
                    ];
                    if (typeof refreshLabels === 'function') {
                        preloadTasks.push(refreshLabels(getCurrentLang()));
                    }
                    await Promise.allSettled(preloadTasks);
                }
            } finally {
                if (mounted) {
                    setAuthLoading(false);
                }
            }
        };

        void bootstrapSession();

        return () => {
            mounted = false;
        };
    }, [refreshGridColumnSettings, refreshLabels, refreshSysCodes]);

    // Keep UI login state in sync with session cache. Idle token/session drops used to
    // clear React Query (incl. sys codes) while isLoggedIn stayed true → zombie page with
    // customer rows but empty CATEGORY_CD / CUSTOMER_TYPE lookups.
    useEffect(() => {
        const handleSessionChanged = (event: Event) => {
            const session = (event as CustomEvent<AuthSession | null>).detail;
            const authenticated = Boolean(session?.isAuthenticated);
            setIsLoggedIn(authenticated);
            if (authenticated) {
                void loadCompanyLangSettings(getCurrentCompanyCd(), true);
            }
        };

        window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChanged);
        return () => {
            window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChanged);
        };
    }, []);

    const handleLoginSuccess = () => {
        const authenticated = isAuthenticated();
        if (authenticated) {
            // Do NOT clearFrontendCaches() here. Logout / session-null already cleared RQ.
            // Clearing again races session-changed recovery + login preload and can leave
            // customer CATEGORY_CD / CUSTOMER_TYPE lookups empty after re-login.
            setIsLoggedIn(true);
            setAuthLoading(true);
            const sessionLang = getCurrentSession()?.lang ?? getCurrentLang();
            void (async () => {
                try {
                    const preloadTasks: Promise<unknown>[] = [
                        refreshGridColumnSettings(true),
                        refreshSysCodes(),
                        loadCompanyLangSettings(getCurrentCompanyCd(), true),
                    ];
                    if (typeof refreshLabels === 'function') {
                        preloadTasks.push(refreshLabels(sessionLang));
                    }
                    await Promise.allSettled(preloadTasks);
                } finally {
                    setAuthLoading(false);
                }
            })();
        }
    };

    const handleLogoutSuccess = () => {
        clearGridColumnSettings();
        clearSysCodes();
        clearFrontendCaches();
        setIsLoggedIn(false);
    };

    if (authLoading) {
        return <div className="flex h-screen items-center justify-center bg-gray-50 text-sm text-gray-600">Loading...</div>;
    }

    return (
        <Routes>
            {isLoggedIn ? (
                <Route path="/*" element={<AppContent onLogout={handleLogoutSuccess} />} />
            ) : (
                <>
                    <Route path="/login" element={<LoginPage onLogin={handleLoginSuccess} />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </>
            )}
        </Routes>
    );
}

function App() {
    const isPublicLookupRoute = typeof window !== "undefined" && isPublicAppPath();

    return (
        <Router unstable_useTransitions={false}>
            {isPublicLookupRoute ? <PublicLookupRoutes /> : <AuthenticatedApp />}
        </Router>
    );
}

export default App;
