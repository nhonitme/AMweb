import { Popup as DataGridPopup } from "devextreme-react/data-grid";
import { Popup as TreeListPopup } from "devextreme-react/tree-list";
import type { HiddenEvent, HidingEvent, ShownEvent } from "devextreme/ui/popup";
import { useMemo, type ComponentProps } from "react";

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
type MasterDataPopupShownEvent = Parameters<NonNullable<MasterDataPopupProps["onShown"]>>[0];
type MasterDataPopupHiddenEvent = Parameters<NonNullable<MasterDataPopupProps["onHidden"]>>[0];
type MasterDataPopupHidingEvent = Parameters<NonNullable<MasterDataPopupProps["onHiding"]>>[0];

const editPopupActionIcons = ["save", "close"] as const;
const popupsWithActionIcons = new WeakSet<object>();
const popupEscapeCleanup = new WeakMap<object, PopupEscapeRegistration>();
const popupOverlayWatchCleanup = new WeakMap<object, () => void>();

export type MasterDataEditPopupProps = DataGridPopupProps & {
  scrollable?: boolean;
};

export type MasterDataTreeListEditPopupProps = TreeListPopupProps & {
  scrollable?: boolean;
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

    const iconEl = button.querySelector(".dx-icon");
    if (iconEl) {
      iconEl.className = `dx-icon dx-icon-${icon}`;
      return;
    }

    const iconNode = document.createElement("i");
    iconNode.className = `dx-icon dx-icon-${icon}`;
    button.querySelector(".dx-button-content")?.prepend(iconNode);
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
  if (!popupEscapeCleanup.get(event.component)?.hasLayerAbove()) {
    return false;
  }

  event.cancel = true;
  return true;
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
      class: buildWrapperClass(scrollable, wrapperAttr),
    },
    onShowing: (event: MasterDataPopupShownEvent) => {
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

export default function MasterDataEditPopup({
  title,
  showTitle,
  titleComponent,
  titleRender,
  ...props
}: MasterDataEditPopupProps) {
  const stableTitleComponent = useMasterPopupTitleComponent(title, showTitle, titleComponent, titleRender);
  return (
    <DataGridPopup
      {...resolveMasterDataEditPopupProps({
        ...props,
        title,
        showTitle,
        titleComponent: stableTitleComponent,
        titleRender,
      })}
    />
  );
}

export function MasterDataTreeListEditPopup({
  title,
  showTitle,
  titleComponent,
  titleRender,
  ...props
}: MasterDataTreeListEditPopupProps) {
  const stableTitleComponent = useMasterPopupTitleComponent(title, showTitle, titleComponent, titleRender);
  return (
    <TreeListPopup
      {...resolveMasterDataEditPopupProps({
        ...props,
        title,
        showTitle,
        titleComponent: stableTitleComponent,
        titleRender,
      })}
    />
  );
}
