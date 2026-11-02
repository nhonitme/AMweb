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

export const referenceSourceConfig: Partial<Record<ChitType, ReferenceSourceConfig>> = {}

export type InventoryAccountingReferenceOption = ReferenceSourceConfig & {
    optionKey: string
}

export const INVENTORY_LINK_SOURCE_CODE_TYPE = "INVENTORY_LINK_SOURCE"

const INVENTORY_LINK_SOURCE_NOTE_SEPARATOR = "|"

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
