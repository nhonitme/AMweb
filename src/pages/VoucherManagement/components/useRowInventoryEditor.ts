import { useEffect, useRef, useState, type Dispatch, type SetStateAction, type MutableRefObject } from "react"
import notify from "devextreme/ui/notify"
import { getApiErrorMessage } from "@/api/apiTypes"
import { createInventoryVoucher, getInventoryVouchers, updateInventoryVoucher } from "@/api/inventoryVoucherApi"
import { getInventoryInputs, getInventoryOutputs } from "@/api/inventoryLinkApi"
import { clearSysCodeSequencePreviewCache } from "@/api/sysCodeSequenceApi"
import { applyAccountingDetailToInventoryLines, getInventoryTypeForAccountingChitType, type LinkedInventoryTarget } from "@/pages/Inventory/inventoryAccountingLinkUtils"
import { createDefaultInventoryVoucher, formatInventoryDate, getInventoryLedger, mapInventoryVoucherToApiPayload, normalizeInventoryVoucherApi } from "@/pages/Inventory/inventoryVoucherModel"
import type { ChitDetail, ChitInfo, ChitType, InventoryVoucher } from "@/types/voucher"
import type { ChitDetailGridHandle } from "./ChitDetailGridPopup"
import { canLinkOtCogsInventoryDetail, createDefaultChit, createDefaultChitDetail, isOtCogsInventoryLinkDetail } from "../chitUtils"

export type AfterAccountingSave = (saved: ChitInfo, submitted: ChitInfo) => Promise<boolean | void>
export type SaveAccountingWithInventory = (record: ChitInfo, afterSave?: AfterAccountingSave) => Promise<void>
export type InventoryDraftPreparation = (value: InventoryVoucher, row: ChitDetail, source: ChitInfo) => Promise<InventoryVoucher>

export function useRowInventoryEditor({ visible, chitType, readOnly, draftRef, setDraft, gridRef, onSave, onSaveAndNew, inventoryDraftType, prepareInventoryDraft, validateInventoryDraft, canOpenInventoryRow, t }: {
    visible: boolean
    chitType: ChitType
    readOnly: boolean
    draftRef: MutableRefObject<ChitInfo>
    setDraft: Dispatch<SetStateAction<ChitInfo>>
    gridRef: MutableRefObject<ChitDetailGridHandle | null>
    onSave: SaveAccountingWithInventory
    onSaveAndNew?: SaveAccountingWithInventory
    prepareInventoryDraft?: InventoryDraftPreparation
    canOpenInventoryRow?: (row: ChitDetail) => boolean
    inventoryDraftType?: "IR" | "IO"
    validateInventoryDraft?: (value: InventoryVoucher) => void
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

        const inventoryType = target?.chitType ?? inventoryDraftType ?? (chitType === "OT" ? "IO" : getInventoryTypeForAccountingChitType(chitType))
        if (inventoryType !== "IR" && inventoryType !== "IO") return
        busyRef.current = true
        setLoading(true)
        const session = sessionRef.current
        try {
            const rows = await gridRef.current?.savePendingChanges() ?? draftRef.current.DETAILS
            const currentRow = rows.find((item) => item.ROW_KEY === row.ROW_KEY)
            if (!currentRow || currentRow.ISDEL) return
            const otCogs = chitType === "OT" && isOtCogsInventoryLinkDetail(currentRow)
            if (!target && otCogs && !canLinkOtCogsInventoryDetail(currentRow)) {
                notify(
                    t("COGS_DETAIL_LINK_ACCOUNTS_REQUIRED", "Liên kết giá vốn yêu cầu dòng Nợ 632 / Có 156, tiền VND không âm"),
                    "warning",
                    3500,
                )
                return
            }
            let value = pendingRef.current.get(row.ROW_KEY)
            if (target) {
                const result = await getInventoryVouchers(getInventoryLedger(inventoryType), inventoryType, { chitId: target.chitId })
                if (!result.data[0]) throw new Error(t("OPEN_INVENTORY_VOUCHER_FAILED", "Không tìm thấy phiếu kho"))
                value = normalizeInventoryVoucherApi(result.data[0], inventoryType, draftRef.current.COMPANY_CD)
            } else if (!value) {
                const source = draftRef.current
                value = createDefaultInventoryVoucher(inventoryType, source.COMPANY_CD)
                value.CHIT_YMD = source.CHIT_YMD
                if (otCogs) {
                    value.IS_COGS = true
                    value.COGS_AMOUNT = currentRow.AMOUNT
                    value.CHITDETAIL_ID_COGS = currentRow.CHITDETAIL_ID
                }
                value.PAYER_INFO = source.PAYER_INFO
                value.DESCRIPTION_VIET = currentRow.DETAIL_DESCRIPTION_VIET || source.DESCRIPTION_VIET
                value.DESCRIPTION_ENG = currentRow.DETAIL_DESCRIPTION_ENG || source.DESCRIPTION_ENG
                value.DESCRIPTION_KOR = currentRow.DETAIL_DESCRIPTION_KOR || source.DESCRIPTION_KOR
                const defaults = {
                    INVENTORY_YMD: source.CHIT_YMD,
                    AMOUNT_CC: currentRow.AMOUNT,
                    CHITDETAIL_ID: otCogs ? null : currentRow.CHITDETAIL_ID,
                    CHITDETAIL_CD: otCogs ? "" : currentRow.CHITDETAIL_CD,
                }
                value.INPUTS = value.INPUTS.map((line) => ({ ...line, ...defaults }))
                value.OUTPUTS = value.OUTPUTS.map((line) => ({ ...line, ...defaults, OUTPUT_INVENTORY_YMD: source.CHIT_YMD }))
                if (prepareInventoryDraft) value = await prepareInventoryDraft(value, currentRow, source)
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
        const otCogs = chitType === "OT" && isOtCogsInventoryLinkDetail(detail)
        const linked = {
            ...value,
            CHIT_YMD: formatInventoryDate(value.CHIT_YMD),
            CHITDETAIL_ID_COGS: otCogs ? detail.CHITDETAIL_ID : value.CHITDETAIL_ID_COGS,
            IS_COGS: otCogs || value.IS_COGS,
            INPUTS: type === "IR" ? value.INPUTS.flatMap((line) => update && Number(line.CHITDETAIL_ID) > 0 ? [line] : applyAccountingDetailToInventoryLines([line], detail.CHITDETAIL_ID, detail.CHITDETAIL_CD)) : value.INPUTS,
            OUTPUTS: type === "IO" && !otCogs ? value.OUTPUTS.flatMap((line) => update && Number(line.CHITDETAIL_ID) > 0 ? [line] : applyAccountingDetailToInventoryLines([line], detail.CHITDETAIL_ID, detail.CHITDETAIL_CD)) : value.OUTPUTS,
        }
        const payload = mapInventoryVoucherToApiPayload(linked)
        if (prepareInventoryDraft && !update && Number(detail.CHITDETAIL_ID) > 0) {
            // Reconcile a successful create whose response was lost before retrying.
            const existing = type === "IR" ? await getInventoryInputs([Number(detail.CHITDETAIL_ID)]) : await getInventoryOutputs([Number(detail.CHITDETAIL_ID)])
            const active = existing.filter((line) => line.ISDEL !== true && Number(line.ISDEL ?? 0) !== 1)
            if (active.length) {
                const expected = (type === "IR" ? linked.INPUTS : linked.OUTPUTS).filter((line) => !line.ISDEL)
                const signature = (line: typeof active[number] | typeof expected[number]) => JSON.stringify([
                    Number(line.PRODUCT_ID), Number(line.STORE_ID), line.UNIT_CD, Number(line.QUANTITY), String(line.FC_TYPE ?? "").toUpperCase(), Number(line.EXCHANGE_RATES),
                    Number(line.AMOUNT_CC), Number(line.AMOUNT_FC),
                    "REVENUE_AMOUNT_CC" in line ? Number(line.REVENUE_AMOUNT_CC) : 0,
                    "REVENUE_AMOUNT_FC" in line ? Number(line.REVENUE_AMOUNT_FC) : 0,
                ])
                const ids = [...new Set(active.map((line) => Number(line.INVENTORY_ID)).filter((id) => id > 0))]
                if (ids.length !== 1 || JSON.stringify(active.map(signature).sort()) !== JSON.stringify(expected.map(signature).sort())) {
                    throw new Error("Dòng tiền hàng đã có liên kết kho khác dữ liệu bản nháp. Vui lòng mở lại chứng từ để kiểm tra trước khi lưu.")
                }
                const found = await getInventoryVouchers(getInventoryLedger(type), type, { chitId: ids[0] })
                if (!found.data[0]) throw new Error("Không đọc được phiếu kho đã liên kết để xác nhận lần lưu trước.")
                return normalizeInventoryVoucherApi(found.data[0], type, value.COMPANY_CD)
            }
        }
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
        validateInventoryDraft?.(value)
        busyRef.current = true
        setLoading(true)
        try {
            const row = draftRef.current.DETAILS.find((item) => item.ROW_KEY === editor.rowKey && !item.ISDEL)
            if (!row) throw new Error("Dòng nguồn không còn tồn tại")
            if (chitType === "SO" || chitType === "OT") {
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
        if (chitType === "SO" || chitType === "OT") {
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
        // VAT imports use the same preparation and persistence for one or many invoices,
        // including rows whose inventory editor has never been opened.
        if (prepareInventoryDraft && canOpenInventoryRow) {
            busyRef.current = true
            setLoading(true)
            try {
                const type = inventoryDraftType ?? getInventoryTypeForAccountingChitType(chitType)
                if (type !== "IR" && type !== "IO") throw new Error("Không xác định được loại phiếu kho.")
                for (const row of record.DETAILS.filter((item) => !item.ISDEL && canOpenInventoryRow(item))) {
                    if (pendingRef.current.has(row.ROW_KEY)) continue
                    const linked = type === "IR" ? row.INVENTORY_INPUTS : row.INVENTORY_OUTPUTS
                    if (linked.some((line) => Number(line.INVENTORY_ID) > 0 && Number(line.ISDEL ?? 0) !== 1)) continue
                    const value = createDefaultInventoryVoucher(type, record.COMPANY_CD)
                    value.CHIT_YMD = record.CHIT_YMD
                    value.DESCRIPTION_VIET = record.DESCRIPTION_VIET
                    const prepared = await prepareInventoryDraft(value, row, record)
                    validateInventoryDraft?.(prepared)
                    pendingRef.current.set(row.ROW_KEY, prepared)
                }
            } catch (error) {
                notify(getApiErrorMessage(error, "Không tải được chi tiết kho để lưu."), "warning", 5000)
                return
            } finally {
                setPendingKeys([...pendingRef.current.keys()])
                busyRef.current = false
                setLoading(false)
            }
        }
        try {
            for (const value of pendingRef.current.values()) validateInventoryDraft?.(value)
        } catch (error) {
            notify(getApiErrorMessage(error, "Thông tin phiếu kho chưa đầy đủ."), "warning", 5000)
            return
        }
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
        deleted: () => {
            if (!editor) return
            const id = Number(editor.value.CHIT_ID)
            pendingRef.current.delete(editor.rowKey)
            setPendingKeys([...pendingRef.current.keys()])
            setDraft((source) => ({ ...source, DETAILS: source.DETAILS.map((detail) => ({
                ...detail,
                INVENTORY_INPUTS: detail.INVENTORY_INPUTS.filter((line) => Number(line.INVENTORY_ID) !== id),
                INVENTORY_OUTPUTS: detail.INVENTORY_OUTPUTS.filter((line) => Number(line.INVENTORY_ID) !== id),
            })) }))
            setRefreshVersion((version) => version + 1)
            setEditor(null)
        },
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
