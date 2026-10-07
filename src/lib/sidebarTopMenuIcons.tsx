import type { SVGProps } from "react"
import type { MenuTreeNode } from "@/types/menu"

// Phosphor Icons (duotone weight), provided by the user as a curated,
// pre-mapped set for this exact sidebar (see the icon pack's own
// icons.json / README.md). Inlined as plain React components instead of
// adding the @phosphor-icons/react package or shipping extra static SVG
// assets -- each icon is just two <path> fills (a 20%-opacity background
// shape plus a full-opacity foreground shape), both using currentColor so
// the existing monochrome-gray / red-active CSS color system in
// devextreme-overrides.css keeps controlling icon color exactly as it did
// for the previous lucide-react icons.
export type PhosphorIcon = (props: SVGProps<SVGSVGElement> & { size?: number }) => JSX.Element

function createDuotoneIcon(backgroundPath: string, foregroundPath: string): PhosphorIcon {
  return function PhosphorDuotoneIcon({ size = 24, ...rest }) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 256 256"
        fill="currentColor"
        {...rest}
      >
        <path d={backgroundPath} opacity={0.2} />
        <path d={foregroundPath} />
      </svg>
    )
  }
}

// -- Tổng quan (squares-four-duotone.svg) --
const SquaresFourIcon = createDuotoneIcon(
  "M112,56v48a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V56a8,8,0,0,1,8-8h48A8,8,0,0,1,112,56Zm88-8H152a8,8,0,0,0-8,8v48a8,8,0,0,0,8,8h48a8,8,0,0,0,8-8V56A8,8,0,0,0,200,48Zm-96,96H56a8,8,0,0,0-8,8v48a8,8,0,0,0,8,8h48a8,8,0,0,0,8-8V152A8,8,0,0,0,104,144Zm96,0H152a8,8,0,0,0-8,8v48a8,8,0,0,0,8,8h48a8,8,0,0,0,8-8V152A8,8,0,0,0,200,144Z",
  "M200,136H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Zm0,64H152V152h48v48ZM104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Zm-96,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48v48Z",
)

// -- Quản lý dữ liệu (database-duotone.svg) --
const DatabaseIcon = createDuotoneIcon(
  "M216,80c0,26.51-39.4,48-88,48S40,106.51,40,80s39.4-48,88-48S216,53.49,216,80Z",
  "M128,24C74.17,24,32,48.6,32,80v96c0,31.4,42.17,56,96,56s96-24.6,96-56V80C224,48.6,181.83,24,128,24Zm80,104c0,9.62-7.88,19.43-21.61,26.92C170.93,163.35,150.19,168,128,168s-42.93-4.65-58.39-13.08C55.88,147.43,48,137.62,48,128V111.36c17.06,15,46.23,24.64,80,24.64s62.94-9.68,80-24.64ZM69.61,53.08C85.07,44.65,105.81,40,128,40s42.93,4.65,58.39,13.08C200.12,60.57,208,70.38,208,80s-7.88,19.43-21.61,26.92C170.93,115.35,150.19,120,128,120s-42.93-4.65-58.39-13.08C55.88,99.43,48,89.62,48,80S55.88,60.57,69.61,53.08ZM186.39,202.92C170.93,211.35,150.19,216,128,216s-42.93-4.65-58.39-13.08C55.88,195.43,48,185.62,48,176V159.36c17.06,15,46.23,24.64,80,24.64s62.94-9.68,80-24.64V176C208,185.62,200.12,195.43,186.39,202.92Z",
)

// -- Tài chính (wallet-duotone.svg) --
const WalletIcon = createDuotoneIcon(
  "M224,80V192a8,8,0,0,1-8,8H56a16,16,0,0,1-16-16V56A16,16,0,0,0,56,72H216A8,8,0,0,1,224,80Z",
  "M216,64H56a8,8,0,0,1,0-16H192a8,8,0,0,0,0-16H56A24,24,0,0,0,32,56V184a24,24,0,0,0,24,24H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64Zm0,128H56a8,8,0,0,1-8-8V78.63A23.84,23.84,0,0,0,56,80H216Zm-48-60a12,12,0,1,1,12,12A12,12,0,0,1,168,132Z",
)

// -- Mua hàng (shopping-cart-duotone.svg) --
const ShoppingCartIcon = createDuotoneIcon(
  "M224,64l-12.16,66.86A16,16,0,0,1,196.1,144H70.55L56,64Z",
  "M230.14,58.87A8,8,0,0,0,224,56H62.68L56.6,22.57A8,8,0,0,0,48.73,16H24a8,8,0,0,0,0,16h18L67.56,172.29a24,24,0,0,0,5.33,11.27,28,28,0,1,0,44.4,8.44h45.42A27.75,27.75,0,0,0,160,204a28,28,0,1,0,28-28H91.17a8,8,0,0,1-7.87-6.57L80.13,152h116a24,24,0,0,0,23.61-19.71l12.16-66.86A8,8,0,0,0,230.14,58.87ZM104,204a12,12,0,1,1-12-12A12,12,0,0,1,104,204Zm96,0a12,12,0,1,1-12-12A12,12,0,0,1,200,204Zm4-74.57A8,8,0,0,1,196.1,136H77.22L65.59,72H214.41Z",
)

// -- Bán hàng (trend-up-duotone.svg) --
const TrendUpIcon = createDuotoneIcon(
  "M232,56v64L168,56Z",
  "M232,48H168a8,8,0,0,0-5.66,13.66L188.69,88,136,140.69l-34.34-34.35a8,8,0,0,0-11.32,0l-72,72a8,8,0,0,0,11.32,11.32L96,123.31l34.34,34.35a8,8,0,0,0,11.32,0L200,99.31l26.34,26.35A8,8,0,0,0,240,120V56A8,8,0,0,0,232,48Zm-8,52.69L187.31,64H224Z",
)

// -- Kho (warehouse-duotone.svg) --
const WarehouseIcon = createDuotoneIcon(
  "M184,128v64H72V128Z",
  "M240,184h-8V57.9l9.67-2.08a8,8,0,1,0-3.35-15.64l-224,48A8,8,0,0,0,16,104a8.16,8.16,0,0,0,1.69-.18L24,102.47V184H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM40,99,216,61.33V184H192V128a8,8,0,0,0-8-8H72a8,8,0,0,0-8,8v56H40Zm136,53H80V136h96ZM80,168h96v16H80Z",
)

// -- Tài sản (buildings-duotone.svg) --
const BuildingsIcon = createDuotoneIcon(
  "M136,32V216H40V85.35a8,8,0,0,1,3.56-6.66l80-53.33A8,8,0,0,1,136,32Z",
  "M240,208H224V96a16,16,0,0,0-16-16H144V32a16,16,0,0,0-24.88-13.32L39.12,72A16,16,0,0,0,32,85.34V208H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM208,96V208H144V96ZM48,85.34,128,32V208H48ZM112,112v16a8,8,0,0,1-16,0V112a8,8,0,1,1,16,0Zm-32,0v16a8,8,0,0,1-16,0V112a8,8,0,1,1,16,0Zm0,56v16a8,8,0,0,1-16,0V168a8,8,0,0,1,16,0Zm32,0v16a8,8,0,0,1-16,0V168a8,8,0,0,1,16,0Z",
)

// -- Thuế (percent-duotone.svg) --
const PercentIcon = createDuotoneIcon(
  "M95.8,56.2a28,28,0,1,1-39.6,0A28,28,0,0,1,95.8,56.2Zm104,104a28,28,0,1,0,0,39.6A28,28,0,0,0,199.8,160.2Z",
  "M205.66,61.64l-144,144a8,8,0,0,1-11.32-11.32l144-144a8,8,0,0,1,11.32,11.31ZM50.54,101.44a36,36,0,0,1,50.92-50.91h0a36,36,0,0,1-50.92,50.91ZM56,76A20,20,0,1,0,90.14,61.84h0A20,20,0,0,0,56,76ZM216,180a36,36,0,1,1-10.54-25.46h0A35.76,35.76,0,0,1,216,180Zm-16,0a20,20,0,1,0-5.86,14.14A19.87,19.87,0,0,0,200,180Z",
)

// -- Báo cáo tổng hợp (chart-bar-duotone.svg) --
const ChartBarIcon = createDuotoneIcon(
  "M208,40V208H152V40Z",
  "M224,200h-8V40a8,8,0,0,0-8-8H152a8,8,0,0,0-8,8V80H96a8,8,0,0,0-8,8v40H48a8,8,0,0,0-8,8v64H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16ZM160,48h40V200H160ZM104,96h40V200H104ZM56,144H88v56H56Z",
)

// -- Hóa đơn điện tử (receipt-duotone.svg) --
const ReceiptIcon = createDuotoneIcon(
  "M224,56V208l-32-16-32,16-32-16L96,208,64,192,32,208V56a8,8,0,0,1,8-8H216A8,8,0,0,1,224,56Z",
  "M72,104a8,8,0,0,1,8-8h96a8,8,0,0,1,0,16H80A8,8,0,0,1,72,104Zm8,40h96a8,8,0,0,0,0-16H80a8,8,0,0,0,0,16ZM232,56V208a8,8,0,0,1-11.58,7.15L192,200.94l-28.42,14.21a8,8,0,0,1-7.16,0L128,200.94,99.58,215.15a8,8,0,0,1-7.16,0L64,200.94,35.58,215.15A8,8,0,0,1,24,208V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Zm-16,0H40V195.06l20.42-10.22a8,8,0,0,1,7.16,0L96,199.06l28.42-14.22a8,8,0,0,1,7.16,0L160,199.06l28.42-14.22a8,8,0,0,1,7.16,0L216,195.06Z",
)

// -- Chứng từ khấu trừ thuế TNCN (identification-card-duotone.svg) --
const IdentificationCardIcon = createDuotoneIcon(
  "M216,48H40a8,8,0,0,0-8,8V200a8,8,0,0,0,8,8H216a8,8,0,0,0,8-8V56A8,8,0,0,0,216,48ZM96,144a24,24,0,1,1,24-24A24,24,0,0,1,96,144Z",
  "M200,112a8,8,0,0,1-8,8H152a8,8,0,0,1,0-16h40A8,8,0,0,1,200,112Zm-8,24H152a8,8,0,0,0,0,16h40a8,8,0,0,0,0-16Zm40-80V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56ZM216,200V56H40V200H216Zm-80.26-34a8,8,0,1,1-15.5,4c-2.63-10.26-13.06-18-24.25-18s-21.61,7.74-24.25,18a8,8,0,1,1-15.5-4,39.84,39.84,0,0,1,17.19-23.34,32,32,0,1,1,45.12,0A39.76,39.76,0,0,1,135.75,166ZM96,136a16,16,0,1,0-16-16A16,16,0,0,0,96,136Z",
)

// -- Menu dự phòng / fallback (list-duotone.svg) --
const ListIcon = createDuotoneIcon(
  "M216,64V192H40V64Z",
  "M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z",
)

// Same top-level groups financeMenu.ts / reportMenu.ts / flatModuleMenus.ts /
// masterDataMenu.ts already know how to recognize, reused here so the
// sidebar's top-level rail icons stay in sync with those classifiers
// instead of drifting out of step with a second, parallel list.
const OVERVIEW_MENU_CODE = "GRP_OVERVIEW"
const FINANCE_MENU_CODE = "GRP_FINANCE"
const REPORT_MENU_CODE = "GRP_REPORT"

// Ordered so a more specific prefix (e.g. "/ap/purchase") is tried before a
// shorter, unrelated one could ever accidentally shadow it.
const ROUTE_PREFIX_ICONS: Array<[prefix: string, icon: PhosphorIcon]> = [
  ["/master/", DatabaseIcon],
  ["/ap/purchase", ShoppingCartIcon],
  ["/ar/sale", TrendUpIcon],
  ["/inventory", WarehouseIcon],
  ["/fa", BuildingsIcon],
  ["/tax", PercentIcon],
  ["/einvoice", ReceiptIcon],
  ["/pit-withholding", IdentificationCardIcon],
]

function collectRoutePaths(node: MenuTreeNode, out: string[]): void {
  if (node.routePath) {
    out.push(node.routePath)
  }
  for (const child of node.children ?? []) {
    collectRoutePaths(child, out)
  }
}

function routePathMatchesPrefix(routePath: string, prefix: string): boolean {
  if (prefix.endsWith("/")) {
    return routePath.startsWith(prefix)
  }
  return routePath === prefix || routePath.startsWith(`${prefix}/`)
}

/**
 * Picks a Phosphor duotone icon for a top-level sidebar menu, matched the
 * same way the rest of the app tells top-level groups apart: first by the
 * node's own `code` for the handful of groups with a known, stable code
 * (see the comments in financeMenu.ts for why `code`, not the translated
 * display name, is the reliable signal), then by its descendants' route
 * prefixes for everything else. Falls back to the pack's own "Menu dự
 * phòng" (fallback menu) list icon for anything unrecognized, e.g. a
 * brand-new module the backend adds before this mapping is updated for it,
 * or GRP_COSTING, which the user's icon pack does not cover separately.
 */
export function getSidebarTopLevelIcon(node: MenuTreeNode): PhosphorIcon {
  const code = (node.code || node.id || "").trim().toUpperCase()
  if (code === OVERVIEW_MENU_CODE) return SquaresFourIcon
  if (code === FINANCE_MENU_CODE) return WalletIcon
  if (code === REPORT_MENU_CODE) return ChartBarIcon

  const routePaths: string[] = []
  collectRoutePaths(node, routePaths)
  for (const [prefix, icon] of ROUTE_PREFIX_ICONS) {
    if (routePaths.some((routePath) => routePathMatchesPrefix(routePath, prefix))) {
      return icon
    }
  }

  return ListIcon
}
