import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Editing, Popup as DxPopup } from "devextreme-react/data-grid";
import type dxDataGrid from "devextreme/ui/data_grid";
import type { CustomerExt } from "@/types/customerExt";
import { type SysCode } from "@/api/sysCodeService";
import type { FormGroup } from "./CustomerExtForm";
import CustomerExtForm from "./CustomerExtForm";
import ShortcutHelpPopup from "@/components/shortcuts/ShortcutHelpPopup";
import useShortcutBindings from "@/hooks/useShortcutBindings";
import useShortcutHelp from "@/hooks/useShortcutHelp";
import { createShortcutBindings } from "@/lib/shortcuts/shortcutBindings";
import { SHORTCUT_ACTIONS } from "@/lib/shortcuts/shortcutDefinitions";

type CustomerKey = number;

export type CustomerExtEditPopupProps = {
    popupTitle: string;
    translate: (k: string, f?: string) => string;
    formGroups?: FormGroup[];
    isUpdate?: boolean;
    customerTypeCodes?: SysCode[];
    gridRef: React.RefObject<dxDataGrid<CustomerExt, CustomerKey> | null>;
};

function getPopupFocusableElements(container: HTMLElement | null) {
    if (!container) return [] as HTMLElement[];
    const selector = "input, select, textarea, button, [tabindex]:not([tabindex=\"-1\")]";
    return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
    );
}

export default function CustomerExtEditPopup({
    popupTitle,
    translate,
    formGroups,
    isUpdate = false,
    customerTypeCodes = [],
    gridRef,
}: CustomerExtEditPopupProps) {
    const [isOpen, setIsOpen] = useState(false);
    const shortcutActions = useMemo(
        () => [SHORTCUT_ACTIONS.CLOSE, SHORTCUT_ACTIONS.HELP],
        [],
    );
    const {
        shortcutHelpVisible,
        shortcutHelpItems,
        openShortcutHelp,
        closeShortcutHelp,
    } = useShortcutHelp(shortcutActions);

    const closeEditPopup = useCallback(() => {
        const grid = gridRef.current;
        grid?.cancelEditData?.();
        grid?.closeEditCell?.();
    }, [gridRef]);

    const shortcutBindings = useMemo(
        () =>
            createShortcutBindings(
                shortcutActions,
                {
                    [SHORTCUT_ACTIONS.CLOSE]: () => closeEditPopup(),
                    [SHORTCUT_ACTIONS.HELP]: () => openShortcutHelp(),
                },
                {
                    [SHORTCUT_ACTIONS.CLOSE]: { enabled: isOpen, allowInInput: true },
                },
            ),
        [closeEditPopup, isOpen, openShortcutHelp, shortcutActions],
    );

    useShortcutBindings(shortcutBindings);

    useEffect(() => {
        if (!isOpen) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Tab") return;

            const popup = document.querySelector(".dx-popup-content.dx-state-active") as HTMLElement | null;
            const focusable = getPopupFocusableElements(popup);
            if (!focusable.length) return;

            const current = document.activeElement as HTMLElement | null;
            const idx = current ? focusable.indexOf(current) : -1;
            if (idx === -1) return;

            event.preventDefault();
            const next = event.shiftKey ? (idx - 1 + focusable.length) % focusable.length : (idx + 1) % focusable.length;
            focusable[next]?.focus();
        };

        window.addEventListener("keydown", onKeyDown, true);
        return () => window.removeEventListener("keydown", onKeyDown, true);
    }, [isOpen, gridRef]);

    return (
        <>
            <Editing
                mode="popup"
                allowUpdating={true}
                allowAdding={true}
                allowDeleting={true}
                confirmDelete={true}
                startEditAction="dblClick"
            >
                <DxPopup
                    title={popupTitle}
                    showTitle={true}
                    width="90%"
                    maxWidth={1000}
                    deferRendering={true}
                    hideOnOutsideClick={true}
                    onShown={() => setIsOpen(true)}
                    onHidden={() => setIsOpen(false)}
                />
                <CustomerExtForm
                    isUpdate={isUpdate}
                    customerTypeCodes={customerTypeCodes}
                    translate={translate}
                    formGroups={formGroups}
                />
            </Editing>
            <ShortcutHelpPopup
                visible={shortcutHelpVisible}
                shortcuts={shortcutHelpItems}
                onClose={closeShortcutHelp}
            />
        </>
    );
}
