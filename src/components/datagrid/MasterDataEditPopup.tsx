import { Popup as DataGridPopup } from "devextreme-react/data-grid";
import { Popup as TreeListPopup } from "devextreme-react/tree-list";
import "@/components/toolbar/EditorActionToolbar.scss";
import dxButton from "devextreme/ui/button";
import { EDITOR_ACTION_ICONS } from "@/components/toolbar/editorActionDefaults";
import type { HiddenEvent, HidingEvent, ShownEvent } from "devextreme/ui/popup";
import { useMemo, useRef, useState, type ComponentProps } from "react";
import { MasterPopupValidationSummary } from "./masterPopupValidation";

import { useCurrentMenuTitle } from "@/hooks/useCurrentMenuTitle";
import {
  disableBuiltInPopupEscape,
  registerPopupEscapeLayer,
  type PopupEscapeRegistration,
} from "@/components/popup/popupEscapeStack";
import {
  overlayWrapperFromPopupContent,
  raiseOverlayAboveSiblings,
  raiseFormOverlaysAboveSiblings,
} from "@/components/popup/raiseOverlayZIndex";
export const MASTER_DATA_EDIT_POPUP_MAX_HEIGHT = "80vh";
export const MASTER_DATA_EDIT_POPUP_FIELD_SCROLL_THRESHOLD = 8;

type DataGridPopupProps = ComponentProps<typeof DataGridPopup>;
type TreeListPopupProps = ComponentProps<typeof TreeListPopup>;
type MasterDataPopupProps = MasterDataEditPopupProps | MasterDataTreeListEditPopupProps;
type MasterDataPopupShowingEvent = Parameters<NonNullable<MasterDataPopupProps["onShowing"]>>[0];
type MasterDataPopupShownEvent = Parameters<NonNullable<MasterDataPopupProps["onShown"]>>[0];
type MasterDataPopupHiddenEvent = Parameters<NonNullable<MasterDataPopupProps["onHidden"]>>[0];
type MasterDataPopupHidingEvent = Parameters<NonNullable<MasterDataPopupProps["onHiding"]>>[0];

const editPopupActionIcons = [EDITOR_ACTION_ICONS.save, EDITOR_ACTION_ICONS.close] as const;
const popupsWithActionIcons = new WeakSet<object>();
const popupEscapeCleanup = new WeakMap<object, PopupEscapeRegistration>();
const popupOverlayWatchCleanup = new WeakMap<object, () => void>();

export type MasterDataEditPopupProps = DataGridPopupProps & {
  scrollable?: boolean;
  editorMode: "add" | "edit";
};

export type MasterDataTreeListEditPopupProps = TreeListPopupProps & {
  scrollable?: boolean;
  editorMode: "add" | "edit";
};

function buildWrapperClass(scrollable: boolean, wrapperAttr?: Record<string, string>) {
  return [
    "master-data-edit-popup",
    scrollable ? "master-data-edit-popup--scrollable" : "",
    wrapperAttr?.class,
  ]
    .filter(Boolean)
    .join(" ");
}

function applyMasterDataEditPopupButtonIcons(event: ShownEvent) {
  const component = event.component;
  if (popupsWithActionIcons.has(component)) {
    return;
  }

  const content = component.content();
  const wrapper = content?.closest(".dx-overlay-wrapper") ?? content?.parentElement;
  const buttons = wrapper?.querySelectorAll(".dx-popup-bottom .dx-button");
  if (!buttons || buttons.length === 0) {
    return;
  }

  popupsWithActionIcons.add(component);
  buttons.forEach((button, index) => {
    const icon = editPopupActionIcons[index];
    if (!icon) {
      return;
    }

    // Keep the grid's own handlers, validation and editing lifecycle intact.
    // Configure the widget instead of injecting markup outside its renderer.
    dxButton.getInstance(button as HTMLElement)?.option("icon", icon);
  });
}

function registerMasterDataPopupEscape(event: ShownEvent) {
  const component = event.component;
  disableBuiltInPopupEscape(component);
  if (popupEscapeCleanup.has(component)) {
    return;
  }

  popupEscapeCleanup.set(
    component,
    registerPopupEscapeLayer(
      () => {
        void component.hide();
      },
      () => overlayWrapperFromPopupContent(component.content()),
    ),
  );
}

function watchMasterEditOverlayAboveLookup(event: ShownEvent) {
  const component = event.component;
  popupOverlayWatchCleanup.get(component)?.();
  popupOverlayWatchCleanup.delete(component);

  const lookupOpen = Boolean(document.querySelector(".dx-overlay-wrapper.am-lookup-popup"));
  if (!lookupOpen) {
    return;
  }

  const wrapper = overlayWrapperFromPopupContent(component.content());
  if (!wrapper) {
    return;
  }

  raiseOverlayAboveSiblings(wrapper);
  raiseFormOverlaysAboveSiblings();

  const observer = new MutationObserver(() => {
    raiseFormOverlaysAboveSiblings();
  });
  observer.observe(document.body, { childList: true });
  popupOverlayWatchCleanup.set(component, () => observer.disconnect());
}

function unregisterMasterDataPopupEscape(event: HiddenEvent) {
  const component = event.component;
  popupsWithActionIcons.delete(component);
  popupEscapeCleanup.get(component)?.();
  popupEscapeCleanup.delete(component);
  popupOverlayWatchCleanup.get(component)?.();
  popupOverlayWatchCleanup.delete(component);
}

function cancelHideWhenNestedPopupIsOpen(event: HidingEvent): boolean {
  const layerAbove = popupEscapeCleanup.get(event.component)?.hasLayerAbove();
  if (layerAbove) {
    event.cancel = true;
    return true;
  }

  return false;
}

export function shouldUseMasterDataEditPopupScroll(fieldCount: number): boolean {
  return fieldCount >= MASTER_DATA_EDIT_POPUP_FIELD_SCROLL_THRESHOLD;
}

function MasterDataPopupTitleView({ title }: { title?: string }) {
  const menuTitle = useCurrentMenuTitle();
  return (
    <div className="master-data-edit-popup-title-inner">
      <span className="master-data-edit-popup-title-main">{title}</span>
      {menuTitle ? <span className="master-data-edit-popup-title-sub">{menuTitle}</span> : null}
    </div>
  );
}

function resolveMasterDataEditPopupProps({
  height = "auto",
  deferRendering = true,
  showTitle = true,
  scrollable = false,
  editorMode,
  wrapperAttr,
  onShown,
  onShowing,
  onHiding,
  onHidden,
  title,
  titleComponent,
  titleRender,
  ...rest
}: MasterDataEditPopupProps | MasterDataTreeListEditPopupProps) {
  const useCustomTitle = showTitle && !titleComponent && !titleRender;

  return {
    height,
    deferRendering,
    showTitle,
    scrollable,
    title,
    titleComponent: useCustomTitle ? () => <MasterDataPopupTitleView title={title} /> : titleComponent,
    titleRender: useCustomTitle ? undefined : titleRender,
    wrapperAttr: {
      ...wrapperAttr,
      class: `${buildWrapperClass(scrollable, wrapperAttr)} editor-mode--${editorMode}`, 
    },
    onShowing: (event: MasterDataPopupShowingEvent) => {
      if (document.querySelector(".dx-overlay-wrapper.am-lookup-popup")) {
        raiseOverlayAboveSiblings(overlayWrapperFromPopupContent(event.component.content()));
      }
      onShowing?.(event);
    },
    onShown: (event: MasterDataPopupShownEvent) => {
      applyMasterDataEditPopupButtonIcons(event as ShownEvent);
      registerMasterDataPopupEscape(event as ShownEvent);
      watchMasterEditOverlayAboveLookup(event as ShownEvent);
      onShown?.(event);
    },
    onHiding: (event: MasterDataPopupHidingEvent) => {
      const nestedOpen = cancelHideWhenNestedPopupIsOpen(event as HidingEvent);
      if (nestedOpen) {
        return;
      }
      onHiding?.(event);
    },
    onHidden: (event: MasterDataPopupHiddenEvent) => {
      unregisterMasterDataPopupEscape(event as HiddenEvent);
      onHidden?.(event);
    },
    ...rest,
  };
}

function useMasterPopupTitleComponent(
  title: MasterDataEditPopupProps["title"],
  showTitle: MasterDataEditPopupProps["showTitle"],
  titleComponent: MasterDataEditPopupProps["titleComponent"],
  titleRender: MasterDataEditPopupProps["titleRender"],
) {
  const useCustomTitle = (showTitle ?? true) && !titleComponent && !titleRender;
  const titleText = typeof title === "string" ? title : undefined;

  return useMemo(
    () => (useCustomTitle ? () => <MasterDataPopupTitleView title={titleText} /> : titleComponent),
    [titleComponent, titleText, useCustomTitle],
  );
}

// Keep popup options stable when onShown updates errorHost.
function useStablePopupProps<T extends object>(props: T): T {
  const previous = useRef(props);
  const keys = Object.keys(props) as Array<keyof T>;
  if (
    keys.length !== Object.keys(previous.current).length ||
    keys.some((key) => !Object.is(props[key], previous.current[key]))
  ) {
    previous.current = props;
  }
  return previous.current;
}

export default function MasterDataEditPopup({
  title,
  showTitle,
  titleComponent,
  titleRender,
  ...props
}: MasterDataEditPopupProps) {
  const [errorHost, setErrorHost] = useState<HTMLElement | null>(null);
  const stableTitleComponent = useMasterPopupTitleComponent(title, showTitle, titleComponent, titleRender);
  const stableProps = useStablePopupProps(props);
  const resolvedProps = useMemo(() => resolveMasterDataEditPopupProps({
        ...stableProps,
        title,
        showTitle,
        titleComponent: stableTitleComponent,
        titleRender,
        onShown: (event) => {
          const content = event.component.content() as HTMLElement;
          let host = content.querySelector<HTMLElement>(".master-popup-validation");
          if (!host) {
            host = document.createElement("div");
            host.className = "master-popup-validation";
            content.prepend(host);
          }
          setErrorHost(host);
          stableProps.onShown?.(event);
        },
        onHidden: (event) => {
          setErrorHost(null);
          stableProps.onHidden?.(event);
        },
      }), [stableProps, title, showTitle, stableTitleComponent, titleRender]);
  return (
    <>
    <DataGridPopup
      {...resolvedProps}
    />
    <MasterPopupValidationSummary host={errorHost} />
    </>
  );
}

export function MasterDataTreeListEditPopup({
  title,
  showTitle,
  titleComponent,
  titleRender,
  ...props
}: MasterDataTreeListEditPopupProps) {
  const [errorHost, setErrorHost] = useState<HTMLElement | null>(null);
  const stableTitleComponent = useMasterPopupTitleComponent(title, showTitle, titleComponent, titleRender);
  return (
    <>
    <TreeListPopup
      {...resolveMasterDataEditPopupProps({
        ...props,
        title,
        showTitle,
        titleComponent: stableTitleComponent,
        titleRender,
        onShown: (event) => {
          const content = event.component.content() as HTMLElement;
          let host = content.querySelector<HTMLElement>(".master-popup-validation");
          if (!host) {
            host = document.createElement("div");
            host.className = "master-popup-validation";
            content.prepend(host);
          }
          setErrorHost(host);
          props.onShown?.(event);
        },
        onHidden: (event) => {
          setErrorHost(null);
          props.onHidden?.(event);
        },
      })}
    />
    <MasterPopupValidationSummary host={errorHost} />
    </>
  );
}
