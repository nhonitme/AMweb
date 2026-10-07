import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react"
import type dxForm from "devextreme/ui/form"
import notify from "devextreme/ui/notify"

import { getSequenceSubmitCode, getVoucherSequencePreviewCode } from "@/lib/codeSequence"
import { flushActiveEditorValue } from "@/lib/shortcuts/shortcutUtils"
import type { ChitInfo, ChitType } from "@/types/voucher"
import { calculateChitAmount, cloneChit, isInventoryLinkedAccountingVoucherType } from "../chitUtils"
import { mergeInventoryIntoDetails } from "@/pages/Inventory/inventoryVoucherUtils"
import type { ChitDetailGridHandle } from "./ChitDetailGridPopup"
import {
    buildChitDetailRowValidationWarnings,
    getActiveDetailRows,
    mapDraftForSave,
    validateChitDetailsForSave,
    type ChitEditorDetailRow,
} from "./chitEditorUtils"

type DetailRow = ChitEditorDetailRow

export type ChitEditorSyncDraftDetailsResult = {
    latestDraft: ChitInfo
    details: DetailRow[]
    activeDetails: DetailRow[]
    amount: number
}

export type EnsureAccountingInventoryLinksForSave = (details: DetailRow[]) => Promise<DetailRow[]>

export type UseChitEditorDraftOptions = {
    visible: boolean
    isUpdate: boolean
    chitType: ChitType
    chitYmd: ChitInfo["CHIT_YMD"]
    draftRef: MutableRefObject<ChitInfo>
    setDraft: Dispatch<SetStateAction<ChitInfo>>
    detailGridRef: MutableRefObject<ChitDetailGridHandle | null>
    formRef: MutableRefObject<dxForm | null>
    ensureAccountingInventoryLinksForSaveRef: MutableRefObject<EnsureAccountingInventoryLinksForSave>
    onSave: (record: ChitInfo) => Promise<void>
    onSaveAndNew?: (record: ChitInfo) => Promise<void>
    t: (key: string, fallback: string) => string
}

export type ChitEditorDraftController = {
    syncDraftDetailsFromEditors: () => Promise<ChitEditorSyncDraftDetailsResult>
    buildRecordForSave: () => Promise<ChitInfo | null>
    handleSave: () => Promise<void>
    handleSaveAndNew: () => Promise<void>
    handleDuplicateDraft: () => Promise<void>
    resetPreviewChitNo: () => void
}

export function useChitEditorDraft({
    visible,
    isUpdate,
    chitType,
    chitYmd,
    draftRef,
    setDraft,
    detailGridRef,
    formRef,
    ensureAccountingInventoryLinksForSaveRef,
    onSave,
    onSaveAndNew,
    t,
}: UseChitEditorDraftOptions): ChitEditorDraftController {
    const autoChitNoRef = useRef<string | null>(null)

    const resetPreviewChitNo = useCallback(() => {
        autoChitNoRef.current = null
    }, [])

    useEffect(() => {
        if (!visible) {
            autoChitNoRef.current = null
        }
    }, [visible])

    useEffect(() => {
        if (!visible || isUpdate) {
            return
        }

        const currentNo = String(draftRef.current.CHIT_NO ?? "").trim()
        const previousPreviewNo = autoChitNoRef.current
        if (currentNo && currentNo !== previousPreviewNo) {
            return
        }

        let cancelled = false

        void getVoucherSequencePreviewCode(chitType, draftRef.current.CHIT_YMD)
            .then((nextNo) => {
                if (cancelled || !nextNo) {
                    return
                }

                autoChitNoRef.current = nextNo
                setDraft((current) => {
                    const activeNo = String(current.CHIT_NO ?? "").trim()
                    if (activeNo && activeNo !== previousPreviewNo) {
                        return current
                    }

                    return {
                        ...current,
                        CHIT_NO: nextNo,
                    }
                })
            })
            .catch((error: unknown) => {
                console.error("Preview voucher no failed", error)
            })

        return () => {
            cancelled = true
        }
    }, [chitType, chitYmd, draftRef, isUpdate, setDraft, visible])

    const syncDraftDetailsFromEditors = useCallback(async (): Promise<ChitEditorSyncDraftDetailsResult> => {
        const currentDraft = draftRef.current
        const syncedBaseDetails = detailGridRef.current ? await detailGridRef.current.savePendingChanges() : currentDraft.DETAILS
        const syncedDetails = syncedBaseDetails as DetailRow[]
        const latestDraft = draftRef.current
        const nextDetails = mergeInventoryIntoDetails(syncedDetails, latestDraft.DETAILS as DetailRow[])
        const nextActiveDetails = getActiveDetailRows(nextDetails as DetailRow[])
        const nextAmount = calculateChitAmount(nextActiveDetails)

        setDraft((current) => ({
            ...current,
            DETAILS: nextDetails as ChitInfo["DETAILS"],
            DETAIL_COUNT: nextActiveDetails.length,
            AMOUNT: nextAmount,
        }))

        return {
            latestDraft,
            details: nextDetails as DetailRow[],
            activeDetails: nextActiveDetails,
            amount: nextAmount,
        }
    }, [detailGridRef, draftRef, setDraft])

    const flushPendingFormEditors = useCallback(async () => {
        await flushActiveEditorValue()
    }, [])

    const buildRecordForSave = useCallback(async (): Promise<ChitInfo | null> => {
        await flushPendingFormEditors()

        const validationResult = formRef.current?.instance().validate()
        if (validationResult && !validationResult.isValid) {
            return null
        }

        const currentDraft = draftRef.current
        const syncedBaseDetails = detailGridRef.current ? await detailGridRef.current.savePendingChanges() : currentDraft.DETAILS
        const latestDraft = draftRef.current
        const syncedDetails = mergeInventoryIntoDetails(syncedBaseDetails as DetailRow[], latestDraft.DETAILS as DetailRow[])
        const detailsWithInventoryLinks = await ensureAccountingInventoryLinksForSaveRef.current(syncedDetails as DetailRow[])
        const activeSyncedDetails = getActiveDetailRows(detailsWithInventoryLinks as DetailRow[])
        const normalizedChitNo = String(latestDraft.CHIT_NO ?? "").trim()
        const canPersistEmptyLinkedVoucher =
            isInventoryLinkedAccountingVoucherType(chitType) && Number(latestDraft.CHIT_ID ?? 0) > 0
        const detailValidation = validateChitDetailsForSave(activeSyncedDetails, t)

        if (!detailValidation.isValid) {
            detailGridRef.current?.setRowValidationWarnings(
                buildChitDetailRowValidationWarnings(detailValidation.rowKey, detailValidation.missingFields),
            )
            void detailGridRef.current?.focusDetailRow(detailValidation.rowKey, detailValidation.focusField)
            notify(detailValidation.message, "error", 4000)
            return null
        }

        if (detailValidation.details.length === 0 && !canPersistEmptyLinkedVoucher) {
            notify(t("NO_DETAIL_ROWS", "Vui lòng nhập ít nhất một dòng chi tiết."), "warning", 3000)
            return null
        }

        detailGridRef.current?.clearRowValidationWarnings()
        const totalAmount = calculateChitAmount(detailValidation.details)

        return mapDraftForSave({
            ...latestDraft,
            CHIT_CD: String(latestDraft.CHIT_CD ?? "").trim(),
            CHIT_NO: getSequenceSubmitCode(normalizedChitNo),
            DETAILS: detailValidation.details,
            DETAIL_COUNT: detailValidation.details.length,
            AMOUNT: totalAmount,
        })
    }, [chitType, detailGridRef, draftRef, ensureAccountingInventoryLinksForSaveRef, flushPendingFormEditors, formRef, t])

    const handleSave = useCallback(async () => {
        const record = await buildRecordForSave()
        if (!record) {
            return
        }

        await onSave(record)
    }, [buildRecordForSave, onSave])

    const handleSaveAndNew = useCallback(async () => {
        const record = await buildRecordForSave()
        if (!record) {
            return
        }

        if (onSaveAndNew) {
            await onSaveAndNew(record)
            return
        }

        await onSave(record)
    }, [buildRecordForSave, onSave, onSaveAndNew])

    const handleDuplicateDraft = useCallback(async () => {
        const currentDraft = draftRef.current
        const syncedBaseDetails = detailGridRef.current ? await detailGridRef.current.savePendingChanges() : currentDraft.DETAILS
        const duplicatedDetails = getActiveDetailRows(
            mergeInventoryIntoDetails(syncedBaseDetails as DetailRow[], currentDraft.DETAILS as DetailRow[]) as DetailRow[],
        ).map((detail, index) => ({
            ...detail,
            ISDEL: false,
            CHITDETAIL_ID: null,
            CHIT_ID: null,
            CHITDETAIL_CD: "",
            SORT: index + 1,
            CREATE_BY: "",
            CREATE_AT: null,
            UPDATE_BY: "",
            UPDATE_AT: null,
        }))

        setDraft((current) => ({
            ...cloneChit(current),
            CHIT_ID: null,
            CHIT_CD: "",
            CHIT_NO: "",
            DETAILS: duplicatedDetails,
            DETAIL_COUNT: duplicatedDetails.length,
            AMOUNT: calculateChitAmount(duplicatedDetails),
            CREATE_BY: "",
            CREATE_AT: null,
            UPDATE_BY: "",
            UPDATE_AT: null,
        }))
    }, [detailGridRef, draftRef, setDraft])

    return {
        syncDraftDetailsFromEditors,
        buildRecordForSave,
        handleSave,
        handleSaveAndNew,
        handleDuplicateDraft,
        resetPreviewChitNo,
    }
}
