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

const ProductManagementPage = lazy(() => import("@/pages/Module/ProductManagement/ProductManagementPage"))
const ProductKindManagementPage = lazy(() => import("@/pages/Module/ProductKindManagement/ProductKindManagementPage"))
const ProductUnitManagementPage = lazy(() => import("@/pages/Module/ProductUnitManagement/ProductUnitManagementPage"))
const StoreManagementPage = lazy(() => import("@/pages/Module/StoreManagement/StoreManagementPage"))
const StoreKindManagementPage = lazy(() => import("@/pages/Module/StoreKindManagement/StoreKindManagementPage"))
const CustomerManagementPage = lazy(() => import("@/pages/Module/CustomerManagementPage/CustomerManagementPage"))
const BankManagementPage = lazy(() => import("@/pages/Module/BankManagementPage/BankManagementPage"))
const DepartmentManagementPage = lazy(() => import("@/pages/Module/DepartmentManagement/DepartmentManagementPage"))
const ManagementInfoPage = lazy(() => import("@/pages/Module/ManagementInfo/ManagementInfoPage"))
const AcclistManagementPage = lazy(() => import("@/pages/Module/AcclistManagement/AcclistManagementPage"))

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
    <ProductManagementPage mode="lookup" onPickProduct={onPick} onCloseLookup={closePopup} />,
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
    <ProductKindManagementPage mode="lookup" onPickProductKind={onPick} onCloseLookup={closePopup} />,
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
    <ProductUnitManagementPage mode="lookup" onPickUnit={onPick} onCloseLookup={closePopup} />,
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
    <StoreManagementPage mode="lookup" onPickStore={onPick} onCloseLookup={closePopup} />,
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
    <StoreKindManagementPage mode="lookup" onPickStoreKind={onPick} onCloseLookup={closePopup} />,
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
    <CustomerManagementPage mode="lookup" onPickCustomer={onPick} onCloseLookup={closePopup} />,
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
    <AcclistManagementPage mode="lookup" onPickAcclist={onPick} onCloseLookup={closePopup} />,
  )
}
