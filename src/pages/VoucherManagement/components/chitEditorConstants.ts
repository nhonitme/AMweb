import type { AnimationConfig } from "devextreme/common/core/animation"

import type { SysCode } from "@/api/sysCodeService"
import type { ChitLedger, ChitType } from "@/types/voucher"

export const POPUP_FADE_ANIMATION: { show: AnimationConfig; hide: AnimationConfig } = {
    show: { type: "fade", duration: 120, from: 0, to: 1 },
    hide: { type: "fade", duration: 80, from: 1, to: 0 },
}

export type ReferenceSourceConfig = {
    ledger: ChitLedger
    chitType: ChitType
    hintKey: string
    hintFallback: string
}

// TEMP disabled: linking moved to inventory vouchers (IR/IO pick accounting voucher).
// Restore these entries to re-enable ReferenceLookup on PO/PD/PR/SO/SD/SR.
export const referenceSourceConfig: Partial<Record<ChitType, ReferenceSourceConfig>> = {
    // PO: {
    //     ledger: "AP",
    //     chitType: "IR",
    //     hintKey: "REFERENCE",
    //     hintFallback: "Chọn phiếu nhập kho",
    // },
    // PD: {
    //     ledger: "AP",
    //     chitType: "IR",
    //     hintKey: "REFERENCE",
    //     hintFallback: "Chọn phiếu nhập kho",
    // },
    // PR: {
    //     ledger: "AP",
    //     chitType: "IO",
    //     hintKey: "REFERENCE",
    //     hintFallback: "Chọn phiếu xuất kho",
    // },
    // SO: {
    //     ledger: "AR",
    //     chitType: "IO",
    //     hintKey: "REFERENCE",
    //     hintFallback: "Chọn phiếu xuất kho",
    // },
    // SD: {
    //     ledger: "AR",
    //     chitType: "IO",
    //     hintKey: "REFERENCE",
    //     hintFallback: "Chọn phiếu xuất kho",
    // },
    // SR: {
    //     ledger: "AR",
    //     chitType: "IR",
    //     hintKey: "REFERENCE",
    //     hintFallback: "Chọn phiếu nhập kho",
    // },
}

/** Accounting vouchers selectable from IR/IO editor (1 inventory ↔ 1 accounting). */
export type InventoryAccountingReferenceOption = ReferenceSourceConfig & {
    optionKey: string
}

/** sys_code CODE_TYPE holding IR/IO ↔ accounting link sources. */
export const INVENTORY_LINK_SOURCE_CODE_TYPE = "INVENTORY_LINK_SOURCE"

/** sys_code.NOTE format: INVENTORY_TYPE|LEDGER|CHIT_TYPE */
const INVENTORY_LINK_SOURCE_NOTE_SEPARATOR = "|"

/**
 * Build IR/IO link options from sys_code rows.
 * CODE_CD = optionKey, CODE_NAME = language key, NOTE = IR|AP|PO.
 */
export function buildInventoryAccountingReferenceOptions(
    codes: readonly SysCode[],
): Partial<Record<"IR" | "IO", InventoryAccountingReferenceOption[]>> {
    const result: Partial<Record<"IR" | "IO", InventoryAccountingReferenceOption[]>> = {};

    codes.forEach((code) => {
        const optionKey = code.CODE_CD?.trim().toUpperCase();
        const [inventoryType, ledger, chitType] = (code.NOTE ?? "")
            .split(INVENTORY_LINK_SOURCE_NOTE_SEPARATOR)
            .map((part) => part.trim().toUpperCase())
            .filter(Boolean);

        if (!optionKey || !ledger || !chitType || (inventoryType !== "IR" && inventoryType !== "IO")) {
            return;
        }

        const option: InventoryAccountingReferenceOption = {
            optionKey,
            ledger: ledger as ChitLedger,
            chitType: chitType as ChitType,
            hintKey: code.CODE_NAME?.trim() || optionKey,
            hintFallback: code.CODE_NAME?.trim() || optionKey,
        };

        result[inventoryType] = [...(result[inventoryType] ?? []), option];
    });

    Object.keys(result).forEach((inventoryType) => {
        result[inventoryType as "IR" | "IO"]?.sort(
            (left, right) =>
                codes.findIndex((code) => code.CODE_CD === left.optionKey) -
                codes.findIndex((code) => code.CODE_CD === right.optionKey),
        );
    });

    return result;
}
