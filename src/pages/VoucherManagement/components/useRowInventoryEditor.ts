import { useEffect, useRef, useState, type Dispatch, type SetStateAction, type MutableRefObject } from "react"
import notify from "devextreme/ui/notify"
import { getApiErrorMessage } from "@/api/apiTypes"
import { createInventoryVoucher, getInventoryVouchers, updateInventoryVoucher } from "@/api/inventoryVoucherApi"
import { clearSysCodeSequencePreviewCache } from "@/api/sysCodeSequenceApi"
import { applyAccountingDetailToInventoryLines, getInventoryTypeForAccountingChitType, type LinkedInventoryTarget } from "@/pages/Inventory/inventoryAccountingLinkUtils"
import { createDefaultInventoryVoucher, formatInventoryDate, getInventoryLedger, mapInventoryVoucherToApiPayload, normalizeInventoryVoucherApi } from "@/pages/Inventory/inventoryVoucherModel"
import type { ChitDetail, ChitInfo, ChitType, InventoryVoucher } from "@/types/voucher"
import type { ChitDetailGridHandle } from "./ChitDetailGridPopup"
import { createDefaultChit, createDefaultChitDetail } from "../chitUtils"

export type AfterAccountingSave = (saved: ChitInfo, submitted: ChitInfo) => Promise<boolean | void>
export type SaveAccountingWithInventory = (record: ChitInfo, afterSave?: AfterAccountingSave) => Promise<void>

export function useRowInventoryEditor({ visible, chitType, readOnly, draftRef, setDraft, gridRef, onSave, onSaveAndNew, t }: {
    visible: boolean
    chitType: ChitType
    readOnly: boolean
    draftRef: MutableRefObject<ChitInfo>
    setDraft: Dispatch<SetStateAction<ChitInfo>>
    gridRef: MutableRefObject<ChitDetailGridHandle | null>
    onSave: SaveAccountingWithInventory
    onSaveAndNew?: SaveAccountingWithInventory
    t: (key: string, fallback: string) => string
}) {
    const pendingRef = useRef(new Map<string, InventoryVoucher>())
    const busyRef = useRef(false)
    const sessionRef = useRef(0)
    const [pendingKeys, setPendingKeys] = useState<string[]>([])
    const [refreshVersion, setRefreshVersion] = useState(0)
    const [loading, setLoading] = useState(false)
    const [editor, setEditor] = useState<{ rowKey: string; value: InventoryVoucher; isUpdate: boolean } | null>(null)
    const [cogsDraft, setCogsDraft] = useState<{ rowKey: string; inventory: InventoryVoucher; value: ChitInfo } | null>(null)
    const cogsDraftReadyRef = useRef(false)
    const cogsDraftQueueRef = useRef<Array<{ rowKey: string; inventory: InventoryVoucher; value: ChitInfo }>>([])

    useEffect(() => {
        if (!visible) {
            sessionRef.current += 1
            pendingRef.current.clear()
            setPendingKeys([])
            setEditor(null)
            setCogsDraft(null)
            cogsDraftReadyRef.current = false
            cogsDraftQueueRef.current = []
        }
    }, [visible])

    const open = async (row: ChitDetail, target?: LinkedInventoryTarget) => {
        if (busyRef.current || (!target && readOnly)) return
        const inventoryType = target?.chitType ?? getInventoryTypeForAccountingChitType(chitType)
        if (inventoryType !== "IR" && inventoryType !== "IO") return
        busyRef.current = true
        setLoading(true)
        const session = sessionRef.current
        try {
            const rows = await gridRef.current?.savePendingChanges() ?? draftRef.current.DETAILS
            const currentRow = rows.find((item) => item.ROW_KEY === row.ROW_KEY)
            if (!currentRow || currentRow.ISDEL) return
            let value = pendingRef.current.get(row.ROW_KEY)
            if (target) {
                const result = await getInventoryVouchers(getInventoryLedger(inventoryType), inventoryType, { chitId: target.chitId })
                if (!result.data[0]) throw new Error(t("OPEN_INVENTORY_VOUCHER_FAILED", "Không tìm thấy phiếu kho"))
                value = normalizeInventoryVoucherApi(result.data[0], inventoryType, draftRef.current.COMPANY_CD)
            } else if (!value) {
                const source = draftRef.current
                value = createDefaultInventoryVoucher(inventoryType, source.COMPANY_CD)
                value.CHIT_YMD = source.CHIT_YMD
                value.PAYER_INFO = source.PAYER_INFO
                value.DESCRIPTION_VIET = currentRow.DETAIL_DESCRIPTION_VIET || source.DESCRIPTION_VIET
                value.DESCRIPTION_ENG = currentRow.DETAIL_DESCRIPTION_ENG || source.DESCRIPTION_ENG
                value.DESCRIPTION_KOR = currentRow.DETAIL_DESCRIPTION_KOR || source.DESCRIPTION_KOR
                const defaults = { INVENTORY_YMD: source.CHIT_YMD, AMOUNT_CC: currentRow.AMOUNT, CHITDETAIL_ID: currentRow.CHITDETAIL_ID, CHITDETAIL_CD: currentRow.CHITDETAIL_CD }
                value.INPUTS = value.INPUTS.map((line) => ({ ...line, ...defaults }))
                value.OUTPUTS = value.OUTPUTS.map((line) => ({ ...line, ...defaults, OUTPUT_INVENTORY_YMD: source.CHIT_YMD }))
            }
            if (session === sessionRef.current) setEditor({ rowKey: row.ROW_KEY, value, isUpdate: Boolean(target) })
        } catch (error) {
            notify(getApiErrorMessage(error, t("OPEN_INVENTORY_VOUCHER_FAILED", "Không mở được phiếu kho")), "error", 3500)
        } finally {
            busyRef.current = false
            setLoading(false)
        }
    }

    const persist = async (value: InventoryVoucher, detail: ChitDetail, update: boolean) => {
        const type = value.CHIT_TYPE
        const linked = {
            ...value,
            CHIT_YMD: formatInventoryDate(value.CHIT_YMD),
            INPUTS: type === "IR" ? value.INPUTS.flatMap((line) => update && Number(line.CHITDETAIL_ID) > 0 ? [line] : applyAccountingDetailToInventoryLines([line], detail.CHITDETAIL_ID, detail.CHITDETAIL_CD)) : value.INPUTS,
            OUTPUTS: type === "IO" ? value.OUTPUTS.flatMap((line) => update && Number(line.CHITDETAIL_ID) > 0 ? [line] : applyAccountingDetailToInventoryLines([line], detail.CHITDETAIL_ID, detail.CHITDETAIL_CD)) : value.OUTPUTS,
        }
        const payload = mapInventoryVoucherToApiPayload(linked)
        const result = update
            ? await updateInventoryVoucher(getInventoryLedger(type), type, payload)
            : await createInventoryVoucher(getInventoryLedger(type), type, payload)
        if (!update) clearSysCodeSequencePreviewCache()
        const saved = normalizeInventoryVoucherApi(result.data, type, value.COMPANY_CD)
        if (!(Number(saved.CHIT_ID) > 0)) throw new Error("Không nhận được ID phiếu kho sau khi lưu")
        return saved
    }

    const saveInventory = async (value: InventoryVoucher) => {
        if (!editor || readOnly || busyRef.current) return
        busyRef.current = true
        setLoading(true)
        try {
            const row = draftRef.current.DETAILS.find((item) => item.ROW_KEY === editor.rowKey && !item.ISDEL)
            if (!row) throw new Error("Dòng nguồn không còn tồn tại")
            if (chitType === "SO") {
                pendingRef.current.set(row.ROW_KEY, { ...value, CHIT_ID: editor.isUpdate ? value.CHIT_ID : null })
                cogsDraftReadyRef.current = false
                cogsDraftQueueRef.current = []
                setCogsDraft(null)
                notify(t("INVENTORY_PENDING_SOURCE_SAVE", "Đã giữ bản nháp phiếu kho. Lưu phiếu nguồn để hoàn tất liên kết."), "info", 3500)
            } else if (Number(row.CHITDETAIL_ID) > 0) {
                const saved = await persist(value, row, editor.isUpdate)
                // Preserve other vouchers on the same row, and update every row linked to this voucher.
                setDraft((source) => ({ ...source, DETAILS: source.DETAILS.map((detail) => saved.CHIT_TYPE === "IR" ? {
                    ...detail,
                    INVENTORY_INPUTS: [...detail.INVENTORY_INPUTS.filter((line) => Number(line.INVENTORY_ID) !== Number(saved.CHIT_ID)), ...saved.INPUTS.filter((line) => Number(line.CHITDETAIL_ID) === Number(detail.CHITDETAIL_ID))],
                } : {
                    ...detail,
                    INVENTORY_OUTPUTS: [...detail.INVENTORY_OUTPUTS.filter((line) => Number(line.INVENTORY_ID) !== Number(saved.CHIT_ID)), ...saved.OUTPUTS.filter((line) => Number(line.CHITDETAIL_ID) === Number(detail.CHITDETAIL_ID))],
                }) }))
                pendingRef.current.delete(row.ROW_KEY)
                setRefreshVersion((version) => version + 1)
                notify(t("SAVE_SUCCESS", "Đã lưu phiếu kho"), "success", 2000)
            } else {
                pendingRef.current.set(row.ROW_KEY, value)
                notify(t("INVENTORY_PENDING_SOURCE_SAVE", "Đã giữ bản nháp phiếu kho. Lưu phiếu nguồn để hoàn tất liên kết."), "info", 3500)
            }
            setPendingKeys([...pendingRef.current.keys()])
            setEditor(null)
        } finally {
            busyRef.current = false
            setLoading(false)
        }
    }

    const afterSave: AfterAccountingSave = async (saved, submitted) => {
        if (chitType === "SO") {
            setDraft(saved)
            for (const [rowKey, pending] of pendingRef.current) {
                const submittedRow = submitted.DETAILS.find((row) => row.ROW_KEY === rowKey && !row.ISDEL)
                const detail = saved.DETAILS.find((row) => row.ROW_KEY === rowKey && !row.ISDEL)
                if (!submittedRow || !detail || !(Number(detail.CHITDETAIL_ID) > 0)) continue
                const inventory = await persist(pending, detail, Number(pending.CHIT_ID ?? 0) > 0)
                if (inventory.CHIT_TYPE === "IR") detail.INVENTORY_INPUTS = inventory.INPUTS
                else detail.INVENTORY_OUTPUTS = inventory.OUTPUTS
                pendingRef.current.delete(rowKey)
                setPendingKeys([...pendingRef.current.keys()])
            }
            setRefreshVersion((version) => version + 1)
            cogsDraftReadyRef.current = false
            cogsDraftQueueRef.current = []
            setCogsDraft(null)
            return false
        }

        for (const row of submitted.DETAILS.filter((item) => !item.ISDEL)) {
            const pending = pendingRef.current.get(row.ROW_KEY)
            if (!pending) continue
            const matches = saved.DETAILS.filter((item) => !item.ISDEL && Number(item.SORT) === Number(row.SORT))
            if (matches.length !== 1 || !(Number(matches[0].CHITDETAIL_ID) > 0)) {
                throw new Error("Phiếu nguồn đã lưu, nhưng chưa xác định được dòng để liên kết kho. Vui lòng thử lưu lại.")
            }
            const detail = matches[0]
            const inventory = await persist(pending, detail, false)
            if (inventory.CHIT_TYPE === "IR") detail.INVENTORY_INPUTS = inventory.INPUTS
            else detail.INVENTORY_OUTPUTS = inventory.OUTPUTS
            pendingRef.current.delete(row.ROW_KEY)
            setPendingKeys([...pendingRef.current.keys()])
        }
        setRefreshVersion((version) => version + 1)
    }

    const saveSource = async (record: ChitInfo, save: SaveAccountingWithInventory) => {
        if (busyRef.current || editor) return
        const activeKeys = new Set(record.DETAILS.filter((row) => !row.ISDEL).map((row) => row.ROW_KEY))
        for (const key of pendingRef.current.keys()) if (!activeKeys.has(key)) pendingRef.current.delete(key)
        if (pendingRef.current.size === 0) {
            await save(record)
            return
        }
        const pendingCogs = [...pendingRef.current.values()].filter((value) => value.CHIT_TYPE === "IO" && Boolean(value.IS_COGS || value.COGS))
        if (chitType === "SO" && pendingCogs.length > 0 && !cogsDraftReadyRef.current) {
            const pendingEntries = [...pendingRef.current.entries()].filter(([, value]) => value.CHIT_TYPE === "IO" && Boolean(value.IS_COGS || value.COGS))
            const makeDraft = (rowKey: string, inventory: InventoryVoucher) => {
                const amount = inventory.OUTPUTS.filter((line) => !line.ISDEL).reduce((sum, line) => sum + Number(line.REVENUE_AMOUNT_CC ?? 0), 0)
                const sourceDetail = record.DETAILS.find((detail) => detail.ROW_KEY === rowKey && !detail.ISDEL)
                const draft = createDefaultChit("OT", inventory.COMPANY_CD)
                draft.CHIT_YMD = inventory.CHIT_YMD
                draft.PAYER_INFO = record.PAYER_INFO || inventory.PAYER_INFO
                draft.DESCRIPTION_VIET = `Giá vốn tổng hợp phiếu xuất kho ${inventory.CHIT_NO || ""}`.trim()
                draft.DETAILS = [{
                    ...createDefaultChitDetail(1, inventory.COMPANY_CD),
                    CHIT_YMD: inventory.CHIT_YMD,
                    DEBIT: "632",
                    CREDIT: "156",
                    AMOUNT: amount,
                    FC_AMOUNT: amount,
                    SORT: 1,
                    CUSTOMER_ID: sourceDetail?.CUSTOMER_ID ?? null,
                    CUSTOMER_CD: sourceDetail?.CUSTOMER_CD ?? "",
                    CUSTOMER_NM_VIET: sourceDetail?.CUSTOMER_NM_VIET ?? "",
                    CUSTOMER_NM_ENG: sourceDetail?.CUSTOMER_NM_ENG ?? "",
                    CUSTOMER_NM_KOR: sourceDetail?.CUSTOMER_NM_KOR ?? "",
                    CUSTOMER_NM_CHINA: sourceDetail?.CUSTOMER_NM_CHINA ?? "",
                    CUSTOMER_OWN_CD: sourceDetail?.CUSTOMER_OWN_CD ?? "",
                    DETAIL_DESCRIPTION_VIET: draft.DESCRIPTION_VIET,
                }]
                draft.AMOUNT = amount
                return { rowKey, inventory, value: draft }
            }
            const entries = pendingEntries.map(([rowKey, inventory]) => makeDraft(rowKey, inventory))
            setCogsDraft(entries[0])
            cogsDraftQueueRef.current = entries.slice(1)
            return
        }
        // Unique SORT values correlate newly allocated detail IDs without relying on response order.
        const submitted = { ...record, DETAILS: record.DETAILS.map((row, index) => ({ ...row, SORT: index + 1 })) }
        busyRef.current = true
        try {
            await save(submitted, afterSave)
        } finally {
            busyRef.current = false
        }
    }

    return {
        editor, loading, pendingKeys, refreshVersion, open, saveInventory, cogsDraft,
        saveCogsDraft: (value: ChitInfo) => {
            if (cogsDraft) {
                const activeDetails = value.DETAILS.filter((line) => !line.ISDEL)
                if (activeDetails.length !== 1 || activeDetails[0].DEBIT !== "632" || activeDetails[0].CREDIT !== "156") {
                    notify("Phiếu giá vốn OT phải có đúng một dòng Nợ 632 / Có 156.", "error", 3500)
                    return
                }
                const amount = activeDetails[0].AMOUNT ?? 0
                const pending = pendingRef.current.get(cogsDraft.rowKey)
                if (pending) pending.COGS_AMOUNT = amount
            }
            const next = cogsDraftQueueRef.current.shift()
            if (next) {
                setCogsDraft(next)
                return
            }
            cogsDraftReadyRef.current = true
            setCogsDraft(null)
        },
        cancelCogsDraft: () => {
            cogsDraftQueueRef.current = []
            setCogsDraft(null)
        },
        close: () => {
            if (busyRef.current) {
                return
            }
            setEditor(null)
        },
        clearPending: () => { pendingRef.current.clear(); setPendingKeys([]) },
        saveSource: (record: ChitInfo) => saveSource(record, onSave),
        saveSourceAndNew: onSaveAndNew ? (record: ChitInfo) => saveSource(record, onSaveAndNew) : undefined,
    }
}
