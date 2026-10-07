import { clearLanguageCache } from "@/lib/i18nLoader";
import { clearCompanyLangCache } from "@/lib/companyLang";
import { clearDecimalSettingsCache } from "@/lib/decimalSettingCache";
import { clearReactQueryCache } from "@/lib/query/clearReactQueryCache";
import { clearSysCodesServiceCache } from "@/lib/sysCodeCache";
import { clearCachedMenuTree } from "@/api/menuApi";
import { clearCompanyInfoCache } from "@/api/companyInfoApi";
import { clearDashboardCache } from "@/api/dashboardApi";
import { clearEInvoiceDecimalSettingsCache } from "@/lib/einvoiceDecimalSettingCache";
import { clearEInvoiceDetailCache } from "@/lib/einvoiceDetailCache";
import { clearEInvoiceSellersCache } from "@/lib/einvoiceSellerCache";
import { clearEInvoiceUserSettingsCache } from "@/lib/einvoiceUserSettingCache";
import { clearEinvLhhdtrungLookupCache } from "@/components/lookup/einvLhhdtrungLookupStore";
import { clearEinvPaymentMethodLookupCache } from "@/components/lookup/einvPaymentMethodLookupStore";
import { clearEinvTchatLookupCache } from "@/components/lookup/einvTchatLookupStore";
import { clearVatRateLookupCache } from "@/components/lookup/vatRateLookupStore";
import {
  clearAcclistLookupCache,
  clearBankLookupCache,
  clearCurrencyLookupCache,
  clearCustomerLookupCache,
  clearDepartmentLookupCache,
  clearInventoryLookupCache,
  clearManagementLookupCache,
  clearProductGroupLookupCache,
  clearUnitLookupCache,
  clearWarehouseLookupCache,
  clearWarehouseTypeLookupCache,
  clearCostCenterLookupCache,
} from "@/components/lookup";

export function clearLookupCaches(): void {
  clearAcclistLookupCache();
  clearBankLookupCache();
  clearCurrencyLookupCache();
  clearCustomerLookupCache();
  clearCostCenterLookupCache();
  clearDepartmentLookupCache();
  clearInventoryLookupCache();
  clearManagementLookupCache();
  clearProductGroupLookupCache();
  clearUnitLookupCache();
  clearWarehouseLookupCache();
  clearWarehouseTypeLookupCache();
}

/** Xóa cache e-invoice (sessionStorage + in-memory + lookup) — gọi khi logout / đổi công ty. */
export function clearEInvoiceCaches(): void {
  const clearAll = ""
  clearEInvoiceDetailCache(undefined, clearAll);
  clearEInvoiceUserSettingsCache(clearAll);
  clearEInvoiceSellersCache(clearAll);
  clearEInvoiceDecimalSettingsCache(clearAll);
  clearEinvLhhdtrungLookupCache();
  clearEinvTchatLookupCache();
  clearEinvPaymentMethodLookupCache();
  clearVatRateLookupCache();
}

export function clearFrontendCaches(): void {
  clearReactQueryCache();
  clearSysCodesServiceCache();
  clearLanguageCache();
  clearDecimalSettingsCache();
  clearCompanyLangCache();
  clearCachedMenuTree();
  clearCompanyInfoCache();
  clearDashboardCache();
  clearEInvoiceCaches();
  clearLookupCaches();
}
