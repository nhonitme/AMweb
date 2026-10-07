import { lazy, Suspense, type ReactNode } from "react"

import type { AcclistInfo } from "@/types/acclist"
import type { BankInfo } from "@/types/bankInfo"
import type { CustomerExt } from "@/types/customerExt"
import type { DepartmentInfo } from "@/types/departmentInfo"
import type { etcData } from "@/types/etcData"
import type { ManagementInfo } from "@/types/managementInfo"
import type { Product } from "@/types/product"
import type { ProductKind } from "@/types/productKind"
import type { StoreInfo } from "@/types/store"
import type { StoreKindInfo } from "@/types/storeKind"
import type { Unit } from "@/types/unit"

const ProductPage = lazy(() => import("@/pages/Module/ProductManagement/ProductPage"))
const ProductKindPage = lazy(() => import("@/pages/Module/ProductKindManagement/ProductKindPage"))
const ProductUnitPage = lazy(() => import("@/pages/Module/ProductUnitManagement/ProductUnitPage"))
const StorePage = lazy(() => import("@/pages/Module/StoreManagement/StorePage"))
const StoreKindPage = lazy(() => import("@/pages/Module/StoreKindManagement/StoreKindPage"))
const CustomerExtManager = lazy(() => import("@/pages/Module/CustomerManagementPage/CustomerExtManager"))
const BankManagementPage = lazy(() => import("@/pages/Module/BankManagementPage/bankInfo"))
const DepartmentManagementPage = lazy(() => import("@/pages/Module/DepartmentManagement"))
const ManagementInfoPage = lazy(() => import("@/pages/Module/ManagementInfo/ManagementInfoPage"))
const AcclistManager = lazy(() => import("@/pages/Module/AcclistManagement/AcclistManager"))

function MasterLookupPageFallback() {
  return (
    <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-slate-500">
      Đang tải danh mục…
    </div>
  )
}

function wrapMasterLookupPage(content: ReactNode) {
  return <Suspense fallback={<MasterLookupPageFallback />}>{content}</Suspense>
}

export function renderSharedProductLookupPage({
  closePopup,
  onPick,
}: {
  closePopup: () => void
  onPick: (item: Product) => void
}) {
  return wrapMasterLookupPage(
    <ProductPage mode="lookup" onPickProduct={onPick} onCloseLookup={closePopup} />,
  )
}

export function renderSharedProductGroupLookupPage({
  closePopup,
  onPick,
}: {
  closePopup: () => void
  onPick: (item: ProductKind) => void
}) {
  return wrapMasterLookupPage(
    <ProductKindPage mode="lookup" onPickProductKind={onPick} onCloseLookup={closePopup} />,
  )
}

export function renderSharedUnitLookupPage({
  closePopup,
  onPick,
}: {
  closePopup: () => void
  onPick: (item: Unit) => void
}) {
  return wrapMasterLookupPage(
    <ProductUnitPage mode="lookup" onPickUnit={onPick} onCloseLookup={closePopup} />,
  )
}

export function renderSharedWarehouseLookupPage({
  closePopup,
  onPick,
}: {
  closePopup: () => void
  onPick: (item: StoreInfo) => void
}) {
  return wrapMasterLookupPage(
    <StorePage mode="lookup" onPickStore={onPick} onCloseLookup={closePopup} />,
  )
}

export function renderSharedWarehouseTypeLookupPage({
  closePopup,
  onPick,
}: {
  closePopup: () => void
  onPick: (item: StoreKindInfo) => void
}) {
  return wrapMasterLookupPage(
    <StoreKindPage mode="lookup" onPickStoreKind={onPick} onCloseLookup={closePopup} />,
  )
}

export function renderSharedCustomerLookupPage({
  closePopup,
  onPick,
}: {
  closePopup: () => void
  onPick: (item: CustomerExt) => void
}) {
  return wrapMasterLookupPage(
    <CustomerExtManager mode="lookup" onPickCustomer={onPick} onCloseLookup={closePopup} />,
  )
}

export function renderSharedBankLookupPage({
  closePopup,
  onPick,
}: {
  closePopup: () => void
  onPick: (item: BankInfo) => void
}) {
  return wrapMasterLookupPage(
    <BankManagementPage mode="lookup" onPickBank={onPick} onCloseLookup={closePopup} />,
  )
}

export function renderSharedDepartmentLookupPage({
  closePopup,
  onPick,
}: {
  closePopup: () => void
  onPick: (item: DepartmentInfo) => void
}) {
  return wrapMasterLookupPage(
    <DepartmentManagementPage mode="lookup" onPickDepartment={onPick} onCloseLookup={closePopup} />,
  )
}

export function renderSharedManagementLookupPage({
  closePopup,
  onPick,
}: {
  closePopup: () => void
  onPick: (item: ManagementInfo) => void
}) {
  return wrapMasterLookupPage(
    <ManagementInfoPage mode="lookup" onPickManagement={onPick} onCloseLookup={closePopup} />,
  )
}

export function mapAcclistToEtcData(row: AcclistInfo): etcData {
  return {
    ID: row.ACC_ID,
    COMPANY_CD: row.COMPANY_CD ?? "",
    CD: row.ACC_CD,
    NM_VIET: row.ACCTITLE_NM_VIET,
    NM_ENG: row.ACCTITLE_NM_ENG,
    NM_KOR: row.ACCTITLE_NM_KOR,
    NM_CHINA: row.ACCTITLE_NM_CHINA,
  }
}

export function renderSharedAcclistLookupPage({
  closePopup,
  onPick,
}: {
  closePopup: () => void
  onPick: (item: AcclistInfo) => void
}) {
  return wrapMasterLookupPage(
    <AcclistManager mode="lookup" onPickAcclist={onPick} onCloseLookup={closePopup} />,
  )
}
