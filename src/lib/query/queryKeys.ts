/**
 * Query keys tập trung toàn app.
 * Quy ước: key có companyCd / userId / lang khi API phụ thuộc scope đó.
 * Không đưa translate/t vào key.
 */

export const STALE_TIME = {
  /** Lookup / sys code — ít đổi */
  STATIC: 10 * 60_000,
  /** Master data list */
  MASTER: 60_000,
  /** Màn hình nghiệp vụ (period lock overview…) */
  TRANSACTION: 30_000,
  /** User settings */
  USER_SETTING: 5 * 60_000,
  /** Nhãn ngôn ngữ */
  LABELS: 10 * 60_000,
  /** Grid column settings per user */
  GRID_SETTINGS: 5 * 60_000,
} as const

export const queryKeys = {
  sysCodes: {
    all: ["sys-codes"] as const,
    byCompany: (companyCd: string) => [...queryKeys.sysCodes.all, companyCd] as const,
  },

  labels: {
    all: ["labels"] as const,
    byLang: (lang: string) => [...queryKeys.labels.all, lang] as const,
  },

  periodLock: {
    all: ["period-lock"] as const,
    overviewRoot: (companyCd: string) => [...queryKeys.periodLock.all, "overview", companyCd] as const,
    overview: (companyCd: string, year: number) =>
      [...queryKeys.periodLock.overviewRoot(companyCd), year] as const,
    userSettings: (companyCd: string, userId: string) =>
      [...queryKeys.periodLock.all, "user-settings", companyCd, userId] as const,
    progress: (companyCd: string, jobId: string) =>
      [...queryKeys.periodLock.all, "progress", companyCd, jobId] as const,
  },

  master: {
    all: ["master"] as const,
    products: (companyCd: string) => [...queryKeys.master.all, "products", companyCd] as const,
    productKinds: (companyCd: string) => [...queryKeys.master.all, "product-kinds", companyCd] as const,
    productUnits: (companyCd: string) => [...queryKeys.master.all, "product-units", companyCd] as const,
    stores: (companyCd: string) => [...queryKeys.master.all, "stores", companyCd] as const,
    storeKinds: (companyCd: string) => [...queryKeys.master.all, "store-kinds", companyCd] as const,
    acclists: (companyCd: string) => [...queryKeys.master.all, "acclists", companyCd] as const,
    banks: (companyCd: string, lang: string) =>
      [...queryKeys.master.all, "banks", companyCd, lang] as const,
    customerExts: (companyCd: string, lang: string) =>
      [...queryKeys.master.all, "customer-exts", companyCd, lang] as const,
    departments: (companyCd: string, lang: string) =>
      [...queryKeys.master.all, "departments", companyCd, lang] as const,
    managementInfos: (companyCd: string, lang: string) =>
      [...queryKeys.master.all, "management-infos", companyCd, lang] as const,
    inventoryOpenings: (companyCd: string) =>
      [...queryKeys.master.all, "inventory-openings", companyCd] as const,
  },

  gridColumnSettings: {
    all: ["grid-column-settings"] as const,
    scopeRoot: (companyCd: string, userId: string) =>
      [...queryKeys.gridColumnSettings.all, companyCd, userId] as const,
    allForScope: (companyCd: string, userId: string) =>
      [...queryKeys.gridColumnSettings.scopeRoot(companyCd, userId), "all"] as const,
  },

  menu: {
    all: ["menu"] as const,
    tree: (companyCd: string) => [...queryKeys.menu.all, "tree", companyCd] as const,
  },

  openingBalance: {
    all: ["opening-balance"] as const,
    summary: (companyCd: string, openYmd: string) =>
      [...queryKeys.openingBalance.all, "summary", companyCd, openYmd] as const,
    accounts: (companyCd: string, openYmd: string, keyword: string) =>
      [...queryKeys.openingBalance.all, "accounts", companyCd, openYmd, keyword] as const,
    banks: (companyCd: string, openYmd: string, keyword: string) =>
      [...queryKeys.openingBalance.all, "banks", companyCd, openYmd, keyword] as const,
    customers: (companyCd: string, openYmd: string, keyword: string) =>
      [...queryKeys.openingBalance.all, "customers", companyCd, openYmd, keyword] as const,
    departments: (companyCd: string, openYmd: string, keyword: string) =>
      [...queryKeys.openingBalance.all, "departments", companyCd, openYmd, keyword] as const,
  },

  transaction: {
    all: ["transaction"] as const,
    chitsRoot: (companyCd: string) => [...queryKeys.transaction.all, "chits", companyCd] as const,
    chits: (
      companyCd: string,
      ledger: string,
      chitType: string,
      fromYmd: string,
      toYmd: string,
      pageNumber: number,
      pageSize: number,
    ) =>
      [
        ...queryKeys.transaction.chitsRoot(companyCd),
        ledger,
        chitType,
        fromYmd,
        toYmd,
        pageNumber,
        pageSize,
      ] as const,
    inventoryRoot: (companyCd: string) => [...queryKeys.transaction.all, "inventory", companyCd] as const,
    inventory: (
      companyCd: string,
      ledger: string,
      chitType: string,
      fromYmd: string,
      toYmd: string,
      pageNumber: number,
      pageSize: number,
    ) =>
      [
        ...queryKeys.transaction.inventoryRoot(companyCd),
        ledger,
        chitType,
        fromYmd,
        toYmd,
        pageNumber,
        pageSize,
      ] as const,
    einvoiceRoot: (companyCd: string) => [...queryKeys.transaction.all, "einvoice", companyCd] as const,
    einvoices: (
      companyCd: string,
      lang: string,
      fromYmd: string,
      toYmd: string,
      keyword: string,
      invoiceId: number,
      pageNumber?: number,
      pageSize?: number,
      filtersKey = "",
    ) =>
      [
        ...queryKeys.transaction.einvoiceRoot(companyCd),
        "list",
        lang,
        fromYmd,
        toYmd,
        keyword,
        invoiceId,
        pageNumber ?? 0,
        pageSize ?? 0,
        filtersKey,
      ] as const,
    einvoiceDeclarations: (companyCd: string, fromYmd: string, toYmd: string, keyword: string) =>
      [...queryKeys.transaction.einvoiceRoot(companyCd), "declarations", fromYmd, toYmd, keyword] as const,
    einvoiceErrorNotices: (companyCd: string, fromYmd: string, toYmd: string, keyword: string) =>
      [...queryKeys.transaction.einvoiceRoot(companyCd), "error-notices", fromYmd, toYmd, keyword] as const,
    einvoiceSettingSellers: (companyCd: string) =>
      [...queryKeys.transaction.einvoiceRoot(companyCd), "settings", "sellers"] as const,
    einvoiceSettingDecimalsRoot: (companyCd: string) =>
      [...queryKeys.transaction.einvoiceRoot(companyCd), "settings", "decimals"] as const,
    einvoiceSettingDecimals: (companyCd: string, xslId = 0, includeInactive = true) =>
      [...queryKeys.transaction.einvoiceSettingDecimalsRoot(companyCd), xslId, includeInactive ? 1 : 0] as const,
    einvoiceUserSettingsRoot: (companyCd: string) =>
      [...queryKeys.transaction.einvoiceRoot(companyCd), "settings", "user"] as const,
    einvoiceUserSettings: (
      companyCd: string,
      settingId = 0,
      userId = "",
      keyword = "",
      includeDeleted = false,
    ) =>
      [
        ...queryKeys.transaction.einvoiceUserSettingsRoot(companyCd),
        settingId,
        userId,
        keyword,
        includeDeleted ? 1 : 0,
      ] as const,
    einvoiceSellers: (companyCd: string, khhdon: string) =>
      [...queryKeys.transaction.einvoiceRoot(companyCd), "sellers", khhdon, "all-templates"] as const,
    einvoiceDetail: (companyCd: string, invoiceId: number) =>
      [...queryKeys.transaction.einvoiceRoot(companyCd), "detail", invoiceId] as const,
    einvoiceEditorUserDefaults: (companyCd: string) =>
      [...queryKeys.transaction.einvoiceRoot(companyCd), "editor-user-defaults"] as const,
    einvoiceMinutes: (
      companyCd: string,
      fromYmd: string,
      toYmd: string,
      keyword: string,
      status: string,
    ) =>
      [
        ...queryKeys.transaction.einvoiceRoot(companyCd),
        "minutes",
        fromYmd,
        toYmd,
        keyword,
        status,
      ] as const,
    users: (companyCd: string, lang: string) =>
      [...queryKeys.transaction.all, "users", companyCd, lang] as const,
  },

  reports: {
    all: ["reports"] as const,
    options: (companyCd: string, groupCode: string) =>
      [...queryKeys.reports.all, "options", companyCd, groupCode] as const,
  },

  jobs: {
    all: ["jobs"] as const,
    progress: (namespace: string, jobId: string) =>
      [...queryKeys.jobs.all, "progress", namespace, jobId] as const,
  },

  admin: {
    all: ["admin"] as const,
    users: (companyCd: string, lang: string) => [...queryKeys.admin.all, "users", companyCd, lang] as const,
    fixedAssets: (companyCd: string, status: string, accCd: string) =>
      [...queryKeys.admin.all, "fixed-assets", companyCd, status, accCd] as const,
    companyInfo: (companyCd: string) => [...queryKeys.admin.all, "company-info", companyCd] as const,
    profile: () => [...queryKeys.admin.all, "profile"] as const,
    companySignatures: (companyCd: string) => [...queryKeys.admin.all, "company-signatures", companyCd] as const,
    sysCodeSequences: (companyCd: string, objectType: string) =>
      [...queryKeys.admin.all, "sys-code-sequences", companyCd, objectType] as const,
    companyDecimalSettings: (companyCd: string) =>
      [...queryKeys.admin.all, "company-decimal-settings", companyCd] as const,
    reportSignatureMapping: (companyCd: string, reportKey: string, reportCode: string) =>
      [...queryKeys.admin.all, "report-signature-mapping", companyCd, reportKey, reportCode] as const,
  },
} as const

/** @deprecated Import từ queryKeys.periodLock */
export const periodLockQueryKeys = queryKeys.periodLock
