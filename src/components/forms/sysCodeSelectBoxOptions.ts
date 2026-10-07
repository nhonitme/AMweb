import type { SysCode } from "@/api/sysCodeService";
import { createOutlinedEditorOptions } from "@/components/forms/devExtremeEditorOptions";
import {
  createSysCodeDisplayExpr,
  createSysCodeValueExpr,
  type SysCodeTranslate,
  type SysCodeValueMode,
} from "@/lib/sysCodeUtils";
import { refreshEmptySysCodeDropdown } from "@/lib/sysCodeDropdownRefresh";

type SelectBoxDataSource = {
  reload?: () => Promise<unknown> | unknown;
};

type SelectBoxComponent = {
  getDataSource?: () => SelectBoxDataSource | null | undefined;
  option?: {
    (name: string): unknown;
    (name: string, value: unknown): void;
  };
};

type SelectBoxOpenedEvent = {
  component?: SelectBoxComponent;
};

const refreshInFlightComponents = new WeakSet<object>();

function resolveSelectBoxItems(
  event: SelectBoxOpenedEvent,
  fallbackDataSource: SysCode[],
): SysCode[] {
  const liveDataSource = event.component?.option?.("dataSource");
  return Array.isArray(liveDataSource) ? (liveDataSource as SysCode[]) : fallbackDataSource;
}

async function refreshOpenedEmptySysCodeDropdown(
  event: SelectBoxOpenedEvent,
  dataSource: SysCode[],
): Promise<void> {
  const component = event.component;
  if (!component || refreshInFlightComponents.has(component)) {
    return;
  }

  // Prefer live editor dataSource — the closed-over snapshot can stay empty after a refresh,
  // and DevExtreme may re-fire onOpened after option()/reload()/repaint().
  const currentItems = resolveSelectBoxItems(event, dataSource);
  if (currentItems.length > 0) {
    return;
  }

  refreshInFlightComponents.add(component);

  try {
    // Use the tagged fallback so refreshEmptySysCodeDropdown can resolve CODE_TYPE
    // even when the live editor dataSource is an untagged empty array.
    const refreshedDataSource = await refreshEmptySysCodeDropdown(dataSource);
    if (refreshedDataSource.length === 0) {
      return;
    }

    const itemsAfterRefresh = resolveSelectBoxItems(event, dataSource);
    if (itemsAfterRefresh.length > 0) {
      return;
    }

    component.option?.("dataSource", refreshedDataSource);
    await component.getDataSource?.()?.reload?.();
  } catch (error) {
    console.error("Refresh sys code dropdown error", error);
  } finally {
    // Keep the guard briefly so DevExtreme re-entrant onOpened from option()/reload()
    // cannot start another refresh in the same open cycle.
    queueMicrotask(() => {
      refreshInFlightComponents.delete(component);
    });
  }
}

export function createSysCodeSelectBoxEditorOptions(
  dataSource: SysCode[],
  placeholder?: string,
  translate?: SysCodeTranslate,
  valueMode: SysCodeValueMode = "string",
): Record<string, unknown> {
  return createOutlinedEditorOptions({
    dataSource,
    displayExpr: createSysCodeDisplayExpr(translate),
    onOpened: (event: SelectBoxOpenedEvent) => void refreshOpenedEmptySysCodeDropdown(event, dataSource),
    placeholder,
    searchEnabled: true,
    searchExpr: ["CODE_NAME", "CODE_CD"],
    showClearButton: true,
    valueExpr: createSysCodeValueExpr(valueMode),
  });
}
