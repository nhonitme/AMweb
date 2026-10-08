import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react"
import { custom } from "devextreme/ui/dialog"
import notify from "devextreme/ui/notify"
import type { NavigateFunction } from "react-router-dom"

import {
    getChits,
    getInventoryInputs,
    getInventoryLinkStatus,
    getInventoryOutputs,
} from "@/api/voucherApi"
import type { ChitInfo, ChitType } from "@/types/voucher"
import {
    buildAccountingVoucherFromInventorySource,
    calculateChitAmount,
    cloneChitDetail,
    createDefaultChitDetail,
    createRowKey,
    getVoucherRouteByChitType,
    isInventoryInputLinkedAccountingVoucherType,
    isInventoryLinkedAccountingVoucherType,
    normalizeChitRows,
    normalizeInventoryInputApi,
    normalizeInventoryOutputApi,
} from "../chitUtils"
import { normalizeInventoryDraftForEditor as normalizeDraftForEditor } from "@/pages/Inventory/inventoryVoucherUtils"
import { referenceSourceConfig, type ReferenceSourceConfig } from "./chitEditorConstants"
import type { ChitDetailGridHandle } from "./ChitDetailGridPopup"
import {
    attachInventoryInputsToPurchaseDetails,
    attachInventoryOutputsToSalesDetails,
    getActiveDetailRows,
    getDetailInventoryInputs,
    getDetailInventoryOutputs,
    getDetailRowKey,
    getLinkedReferenceSourceIds,
    getPersistedLinkedReferenceSourceIds,
    getReferenceLinkedChitDetailIds,
    getReferenceSourceId,
    hasActiveInventoryReferenceLines,
    hasChitDetailContent,
    isLinkedToCurrentReferenceSource,
    normalizeReferenceSourceIds,
    type ChitEditorDetailRow,
} from "./chitEditorUtils"
import type { ChitEditorSyncDraftDetailsResult } from "./useChitEditorDraft"

type DetailRow = ChitEditorDetailRow

type ReferenceApplyMode = "replace" | "append" | "cancel"

export type { ChitEditorSyncDraftDetailsResult }

export type UseChitEditorReferenceOptions = {
    visible: boolean
    chitType: ChitType
    activeDetails: DetailRow[]
    chitId: number | null
    draftRef: MutableRefObject<ChitInfo>
    setDraft: Dispatch<SetStateAction<ChitInfo>>
    syncDraftDetailsFromEditors: () => Promise<ChitEditorSyncDraftDetailsResult>
    detailGridRef: MutableRefObject<ChitDetailGridHandle | null>
    t: (key: string, fallback: string) => string
    navigate: NavigateFunction
}

export type ChitEditorReferenceController = {
    referenceConfig: ReferenceSourceConfig | null
    referenceEnabled: boolean
    linkedReferenceSourceIds: number[]
    multiReferencePopupVisible: boolean
    selectedReferenceSourceIds: number[]
    pendingUnlinkReferenceSourceIds: number[]
    openMultiReferencePopup: () => void
    closeMultiReferencePopup: () => void
    handleReferenceSelected: (row: ChitInfo) => Promise<void>
    handleConfirmMultiReferenceSelection: (
        selectedSources: ChitInfo[],
        unlinkedSources: ChitInfo[],
        addedSources: ChitInfo[],
    ) => Promise<void>
    resetReferenceState: () => void
    ensureAccountingInventoryLinksForSave: (details: DetailRow[]) => Promise<DetailRow[]>
}

export function useChitEditorReference({
    visible,
    chitType,
    activeDetails,
    chitId,
    draftRef,
    setDraft,
    syncDraftDetailsFromEditors,
    detailGridRef,
    t,
    navigate,
}: UseChitEditorReferenceOptions): ChitEditorReferenceController {
    const [multiReferencePopupVisible, setMultiReferencePopupVisible] = useState(false)
    const [selectedReferenceSourceIds, setSelectedReferenceSourceIds] = useState<number[]>([])
    const [pendingUnlinkReferenceSourceIds, setPendingUnlinkReferenceSourceIds] = useState<number[]>([])
    const referenceInventoryLoadKeyRef = useRef("")

    const referenceConfig = useMemo(() => referenceSourceConfig[chitType] ?? null, [chitType])
    const referenceEnabled = referenceConfig !== null
    const linkedReferenceSourceIds = useMemo(
        () => (isInventoryLinkedAccountingVoucherType(chitType) ? getLinkedReferenceSourceIds(activeDetails, chitType) : []),
        [activeDetails, chitType],
    )

    const resetReferenceState = useCallback(() => {
        referenceInventoryLoadKeyRef.current = ""
        setPendingUnlinkReferenceSourceIds([])
    }, [])

    const openMultiReferencePopup = useCallback(() => {
        setMultiReferencePopupVisible(true)
    }, [])

    const closeMultiReferencePopup = useCallback(() => {
        setMultiReferencePopupVisible(false)
    }, [])

    useEffect(() => {
        if (!visible) {
            setMultiReferencePopupVisible(false)
            setSelectedReferenceSourceIds([])
            setPendingUnlinkReferenceSourceIds([])
            referenceInventoryLoadKeyRef.current = ""
            return
        }

        if (!referenceConfig) {
            setSelectedReferenceSourceIds([])
            return
        }

        if (isInventoryLinkedAccountingVoucherType(chitType)) {
            const pendingUnlinkSourceIds = new Set(pendingUnlinkReferenceSourceIds)
            setSelectedReferenceSourceIds(linkedReferenceSourceIds.filter((sourceId) => !pendingUnlinkSourceIds.has(sourceId)))
            return
        }

        setSelectedReferenceSourceIds([])
    }, [chitType, linkedReferenceSourceIds, pendingUnlinkReferenceSourceIds, referenceConfig, visible])

    useEffect(() => {
        if (!visible || !referenceConfig || !isInventoryLinkedAccountingVoucherType(chitType)) {
            return
        }

        const detailIds = activeDetails
            .map((detail) => Number(detail.CHITDETAIL_ID ?? 0))
            .filter((detailId) => Number.isFinite(detailId) && detailId > 0)

        if (detailIds.length === 0) {
            referenceInventoryLoadKeyRef.current = ""
            return
        }

        const loadKey = `${chitType}:${Number(chitId ?? 0)}:${detailIds.join(",")}`
        if (referenceInventoryLoadKeyRef.current === loadKey) {
            return
        }

        referenceInventoryLoadKeyRef.current = loadKey

        let cancelled = false
        const loadLinkedInventoryLines = async () => {
            try {
                if (isInventoryInputLinkedAccountingVoucherType(chitType)) {
                    const inputs = await getInventoryInputs(referenceConfig.ledger, referenceConfig.chitType, detailIds)
                    if (cancelled) {
                        return
                    }

                    const normalizedInputs = inputs.map((input, index) =>
                        normalizeInventoryInputApi(input, `${input.INPUT_ID ?? index + 1}`),
                    )

                    setDraft((current) => ({
                        ...current,
                        DETAILS: attachInventoryInputsToPurchaseDetails(current.DETAILS as DetailRow[], normalizedInputs) as ChitInfo["DETAILS"],
                    }))
                    return
                }

                const outputs = await getInventoryOutputs(referenceConfig.ledger, referenceConfig.chitType, detailIds)
                if (cancelled) {
                    return
                }

                const normalizedOutputs = outputs.map((output, index) =>
                    normalizeInventoryOutputApi(output, `${output.OUTPUT_ID ?? index + 1}`),
                )

                setDraft((current) => ({
                    ...current,
                    DETAILS: attachInventoryOutputsToSalesDetails(current.DETAILS as DetailRow[], normalizedOutputs) as ChitInfo["DETAILS"],
                }))
            } catch (error) {
                if (!cancelled) {
                    console.error("Load voucher inventory references failed", error)
                }
            }
        }

        void loadLinkedInventoryLines()
        return () => {
            cancelled = true
        }
    }, [activeDetails, chitId, chitType, referenceConfig, setDraft, visible])

    const buildReferenceDetails = useCallback(
        (source: ChitInfo, linkedChitDetailIds?: number[] | null): DetailRow[] => {
            const sourceDetails = getActiveDetailRows((source.DETAILS ?? []) as DetailRow[])
            const companyCd = draftRef.current.COMPANY_CD

            if (isInventoryLinkedAccountingVoucherType(chitType)) {
                return buildAccountingVoucherFromInventorySource(source, chitType, companyCd, linkedChitDetailIds).DETAILS as DetailRow[]
            }

            return sourceDetails.map((detail, index) => {
                const normalizedDetail = cloneChitDetail(detail as ChitInfo["DETAILS"][number])
                return {
                    ...createDefaultChitDetail(index + 1, companyCd),
                    ...normalizedDetail,
                    ROW_KEY: createRowKey(),
                    COMPANY_CD: companyCd,
                    CHITDETAIL_ID: null,
                    CHIT_ID: null,
                    CHITDETAIL_CD: "",
                    SORT: index + 1,
                }
            })
        },
        [chitType, draftRef],
    )

    const promptReferenceApplyMode = useCallback(async (): Promise<ReferenceApplyMode> => {
        const dialog = custom({
            title: t("REFERENCE_CONFIRM_TITLE", "Xử lý dữ liệu hiện tại"),
            messageHtml: `
        <div style="line-height:1.5">
          <div>${t("REFERENCE_CONFIRM_MESSAGE", "Chi tiết nhập kho hiện tại đã có dữ liệu hoặc có thay đổi chưa lưu.")}</div>
          <div style="margin-top:8px">${t("REFERENCE_CONFIRM_SELECT_ACTION", "Chọn cách áp dụng chứng từ tham chiếu.")}</div>
        </div>
      `,
            buttons: [
                {
                    text: t("REFERENCE_REPLACE", "Thay thế dữ liệu hiện tại"),
                    type: "default",
                    onClick: () => "replace",
                },
                {
                    text: t("REFERENCE_APPEND", "Thêm vào sau dữ liệu hiện tại"),
                    onClick: () => "append",
                },
                {
                    text: t("CANCEL", "Hủy"),
                    stylingMode: "text",
                    onClick: () => "cancel",
                },
            ],
            dragEnabled: false,
        })

        return (await dialog.show()) as ReferenceApplyMode
    }, [t])

    const resolveReferenceApplyMode = useCallback(async (): Promise<ReferenceApplyMode> => {
        const syncedState = await syncDraftDetailsFromEditors()

        const currentDetails = getActiveDetailRows(syncedState.details)
        const hasExistingContent = currentDetails.some(hasChitDetailContent)
        if (currentDetails.length === 0 || !hasExistingContent) {
            return "replace"
        }

        const hadPendingChanges = detailGridRef.current?.getGridInstance()?.hasEditData() ?? false
        if (hadPendingChanges || hasExistingContent) {
            return promptReferenceApplyMode()
        }

        return "replace"
    }, [detailGridRef, promptReferenceApplyMode, syncDraftDetailsFromEditors])

    const loadReferenceSourceDetails = useCallback(
        async (sourceHeader: ChitInfo): Promise<ChitInfo> => {
            if (!referenceConfig) {
                return sourceHeader
            }

            if (Array.isArray(sourceHeader.DETAILS) && sourceHeader.DETAILS.length > 0) {
                return sourceHeader
            }

            const sourceId = Number(sourceHeader.CHIT_ID ?? 0)
            if (!Number.isFinite(sourceId) || sourceId <= 0) {
                return sourceHeader
            }

            const response = await getChits(referenceConfig.ledger, referenceConfig.chitType, {
                chitId: sourceId,
                INCLUDE_DETAILS: true,
                pageNumber: 1,
                pageSize: 1,
            })
            const [fullSource] = normalizeChitRows(response.data || [], referenceConfig.chitType)

            if (!fullSource) {
                throw new Error(`Reference voucher ${sourceId} was not found`)
            }

            return fullSource
        },
        [referenceConfig],
    )

    const openLinkedAccountingVoucher = useCallback(
        async (sourceHeader: ChitInfo): Promise<boolean> => {
            if (!referenceConfig || !isInventoryLinkedAccountingVoucherType(chitType)) {
                return false
            }

            const sourceId = Number(sourceHeader.CHIT_ID ?? 0)
            if (!Number.isFinite(sourceId) || sourceId <= 0) {
                return false
            }

            const status = await getInventoryLinkStatus(referenceConfig.ledger, referenceConfig.chitType, sourceId)
            const linkedVoucher = (status?.INVENTORY_VOUCHERS ?? []).find(
                (item) => Number(item.INVENTORY_CHIT_ID ?? 0) > 0 && String(item.INVENTORY_CHIT_TYPE ?? "").trim().length > 0,
            )

            if (!linkedVoucher) {
                return false
            }

            const currentChitId = Number(draftRef.current.CHIT_ID ?? 0)
            const linkedChitId = Number(linkedVoucher.INVENTORY_CHIT_ID ?? 0)
            if (Number.isFinite(currentChitId) && currentChitId > 0 && linkedChitId === currentChitId) {
                return false
            }

            const route = getVoucherRouteByChitType(linkedVoucher.INVENTORY_CHIT_TYPE)
            if (!route) {
                return false
            }

            setMultiReferencePopupVisible(false)
            navigate(route, {
                state: {
                    openChitId: linkedVoucher.INVENTORY_CHIT_ID,
                    openMode: "edit",
                },
            })
            return true
        },
        [chitType, draftRef, navigate, referenceConfig],
    )

    const applyReferenceSelection = useCallback(
        async (sourceHeader: ChitInfo, nextDetails: DetailRow[]): Promise<boolean> => {
            const hasInventoryLines = nextDetails.some(
                (detail) => getDetailInventoryInputs(detail).length > 0 || getDetailInventoryOutputs(detail).length > 0,
            )

            if (isInventoryLinkedAccountingVoucherType(chitType) && !hasInventoryLines) {
                notify(t("SOURCE_DETAILS_ALREADY_LINKED", "Tat ca chi tiet nguon da duoc lap phieu kho"), "warning", 2500)
                return false
            }

            if (nextDetails.length === 0) {
                notify(t("REFERENCE_DETAIL_EMPTY", "Chứng từ tham chiếu chưa có chi tiết"), "warning", 2500)
                return false
            }

            const mode = await resolveReferenceApplyMode()
            if (mode === "cancel") {
                return false
            }

            const currentDetails = getActiveDetailRows(draftRef.current.DETAILS as DetailRow[])
            const appendedDetails =
                mode === "append"
                    ? [
                        ...currentDetails.map((detail, index) => ({
                            ...detail,
                            ROW_KEY: getDetailRowKey(detail, index),
                            SORT: index + 1,
                        })),
                        ...nextDetails.map((detail, index) => ({
                            ...detail,
                            ROW_KEY: createRowKey(),
                            SORT: currentDetails.length + index + 1,
                        })),
                    ]
                    : nextDetails.map((detail, index) => ({
                        ...detail,
                        ROW_KEY: createRowKey(detail.CHITDETAIL_ID),
                        SORT: index + 1,
                    }))

            const finalDetails = appendedDetails
            const finalAmount = calculateChitAmount(finalDetails)

            setDraft((current) =>
                normalizeDraftForEditor(
                    {
                        ...current,
                        PAYER_INFO: String(sourceHeader.PAYER_INFO ?? "").trim() || current.PAYER_INFO,
                        DESCRIPTION_VIET: String(sourceHeader.DESCRIPTION_VIET ?? "").trim() || current.DESCRIPTION_VIET,
                        DESCRIPTION_ENG: String(sourceHeader.DESCRIPTION_ENG ?? "").trim() || current.DESCRIPTION_ENG,
                        DESCRIPTION_KOR: String(sourceHeader.DESCRIPTION_KOR ?? "").trim() || current.DESCRIPTION_KOR,
                        DETAILS: finalDetails,
                        DETAIL_COUNT: finalDetails.length,
                        AMOUNT: finalAmount,
                    },
                    chitType,
                ),
            )
            notify(
                t(
                    mode === "append" ? "REFERENCE_APPENDED" : "REFERENCE_APPLIED",
                    mode === "append" ? "Đã thêm tham chiếu" : "Đã áp dụng chứng từ tham chiếu",
                ),
                "success",
                2500,
            )
            return true
        },
        [
            chitType,
            draftRef,
            resolveReferenceApplyMode,
            setDraft,
            t,
        ],
    )

    const applyReferenceVoucher = useCallback(
        async (sourceHeader: ChitInfo): Promise<boolean> => {
            if (!sourceHeader) {
                notify(t("REFERENCE_REQUIRED", "Vui long chon chung tu tham chieu"), "warning", 2500)
                return false
            }

            try {
                if (await openLinkedAccountingVoucher(sourceHeader)) {
                    return false
                }
            } catch (error) {
                console.error("Open linked voucher failed", error)
            }

            let selectedReferenceItem: ChitInfo
            try {
                selectedReferenceItem = await loadReferenceSourceDetails(sourceHeader)
            } catch (error) {
                console.error("Load reference voucher details failed", error)
                notify(t("LOAD_REFERENCE_FAILED", "Khong tai duoc chung tu tham chieu"), "error", 3000)
                return false
            }

            let linkedChitDetailIds: number[] = []
            if (isInventoryLinkedAccountingVoucherType(chitType) && referenceConfig) {
                try {
                    const status = await getInventoryLinkStatus(
                        referenceConfig.ledger,
                        referenceConfig.chitType,
                        Number(selectedReferenceItem.CHIT_ID ?? 0),
                    )
                    linkedChitDetailIds = status?.LINKED_CHITDETAIL_IDS ?? []
                } catch (error) {
                    console.error("Load reference inventory link status failed", error)
                }
            }

            const nextDetails = buildReferenceDetails(selectedReferenceItem, linkedChitDetailIds)
            return applyReferenceSelection(selectedReferenceItem, nextDetails)
        },
        [
            applyReferenceSelection,
            buildReferenceDetails,
            chitType,
            loadReferenceSourceDetails,
            openLinkedAccountingVoucher,
            referenceConfig,
            t,
        ],
    )

    const buildMultipleReferenceDetails = useCallback(
        async (sources: ChitInfo[], ignoredLinkedSourceIds?: Set<number>) => {
            return await Promise.all(
                sources.map(async (source) => {
                    const selectedReferenceItem = await loadReferenceSourceDetails(source)
                    const sourceId = Number(selectedReferenceItem.CHIT_ID ?? 0)
                    const ignoreLinkedStatus =
                        Number.isFinite(sourceId) && sourceId > 0 && Boolean(ignoredLinkedSourceIds?.has(sourceId))
                    let linkedChitDetailIds: number[] = []
                    if (isInventoryLinkedAccountingVoucherType(chitType) && referenceConfig && !ignoreLinkedStatus) {
                        try {
                            const status = await getInventoryLinkStatus(
                                referenceConfig.ledger,
                                referenceConfig.chitType,
                                Number(selectedReferenceItem.CHIT_ID ?? 0),
                            )
                            linkedChitDetailIds = status?.LINKED_CHITDETAIL_IDS ?? []
                        } catch (error) {
                            console.error("Load reference inventory link status failed", error)
                        }
                    }
                    return buildReferenceDetails(selectedReferenceItem, linkedChitDetailIds)
                }),
            )
        },
        [buildReferenceDetails, chitType, loadReferenceSourceDetails, referenceConfig],
    )

    const handleReferenceSelected = useCallback(
        async (row: ChitInfo) => {
            await applyReferenceVoucher(row)
        },
        [applyReferenceVoucher],
    )

    const handleConfirmMultiReferenceSelection = useCallback(
        async (selectedSources: ChitInfo[], unlinkedSources: ChitInfo[], addedSources: ChitInfo[]) => {
            if (isInventoryLinkedAccountingVoucherType(chitType)) {
                const selectedChitIdList = normalizeReferenceSourceIds(selectedSources.map((source) => source.CHIT_ID))
                const selectedChitIds = new Set(selectedChitIdList)
                const unlinkedChitIds = new Set(normalizeReferenceSourceIds(unlinkedSources.map((source) => source.CHIT_ID)))
                const unlinkedChitDetailIds = new Set(
                    normalizeReferenceSourceIds(unlinkedSources.flatMap((source) => getReferenceLinkedChitDetailIds(source))),
                )
                const persistedLinkedChitIds = new Set(
                    getPersistedLinkedReferenceSourceIds(getActiveDetailRows(draftRef.current.DETAILS as DetailRow[]), chitType),
                )
                const pendingBeforeChitIds = new Set(pendingUnlinkReferenceSourceIds)
                const pendingUnlinkChitIds = new Set(
                    normalizeReferenceSourceIds(
                        unlinkedSources
                            .filter((source) => {
                                const sourceId = getReferenceSourceId(source)
                                return sourceId !== null && (persistedLinkedChitIds.has(sourceId) || isLinkedToCurrentReferenceSource(source))
                            })
                            .map((source) => source.CHIT_ID),
                    ),
                )

                try {
                    for (const source of addedSources) {
                        if (await openLinkedAccountingVoucher(source)) {
                            return
                        }
                    }
                } catch (error) {
                    console.error("Open linked voucher failed", error)
                }

                let newDetailRows: DetailRow[] = []
                if (addedSources.length > 0) {
                    try {
                        newDetailRows = (await buildMultipleReferenceDetails(addedSources, pendingBeforeChitIds))
                            .flat()
                            .filter(hasActiveInventoryReferenceLines)
                    } catch (error) {
                        console.error("Load reference voucher details failed", error)
                        notify(t("LOAD_REFERENCE_FAILED", "Khong tai duoc chung tu tham chiếu"), "error", 3000)
                        return
                    }

                    if (newDetailRows.length === 0) {
                        notify(t("SOURCE_DETAILS_ALREADY_LINKED", "Tat ca chi tiet nguon da duoc lap phieu kho"), "warning", 2500)
                        return
                    }
                }

                setSelectedReferenceSourceIds(selectedChitIdList)
                setPendingUnlinkReferenceSourceIds((current) => {
                    const nextSourceIds = new Set(current)
                    pendingUnlinkChitIds.forEach((sourceId) => {
                        nextSourceIds.add(sourceId)
                    })
                    selectedChitIds.forEach((sourceId) => {
                        nextSourceIds.delete(sourceId)
                    })
                    return normalizeReferenceSourceIds(nextSourceIds)
                })

                setDraft((current) => {
                    const updatedDetails = (current.DETAILS as DetailRow[]).map((detail) => {
                        if (detail.ISDEL) {
                            return detail
                        }

                        const activeLines = isInventoryInputLinkedAccountingVoucherType(chitType)
                            ? getDetailInventoryInputs(detail).filter((input) => !input.ISDEL)
                            : getDetailInventoryOutputs(detail).filter((output) => !output.ISDEL)
                        const allFromUnlinked =
                            activeLines.length > 0 &&
                            activeLines.every((line) => unlinkedChitIds.has(Number(line.INVENTORY_ID ?? 0)))
                        const detailId = Number(detail.CHITDETAIL_ID ?? 0)
                        const isUnlinkedDetail =
                            Number.isFinite(detailId) && detailId > 0 && unlinkedChitDetailIds.has(detailId)
                        return allFromUnlinked || isUnlinkedDetail ? { ...detail, ISDEL: true } : detail
                    })
                    const finalDetails = [...updatedDetails, ...newDetailRows]
                    const nextActiveDetails = getActiveDetailRows(finalDetails)
                    return normalizeDraftForEditor(
                        {
                            ...current,
                            DETAILS: finalDetails,
                            DETAIL_COUNT: nextActiveDetails.length,
                            AMOUNT: calculateChitAmount(nextActiveDetails),
                        },
                        chitType,
                    )
                })

                setMultiReferencePopupVisible(false)
                notify(t("REFERENCE_APPLIED", "Đã cập nhật liên kết tham chiếu"), "success", 2500)
                return
            }

            const mode = await resolveReferenceApplyMode()
            if (mode === "cancel") {
                return
            }

            let detailsSets: DetailRow[][]
            try {
                detailsSets = await buildMultipleReferenceDetails(selectedSources)
            } catch (error) {
                console.error("Load multiple reference voucher details failed", error)
                notify(t("LOAD_REFERENCE_FAILED", "Khong tai duoc chung tu tham chiếu"), "error", 3000)
                return
            }

            const combinedDetails = detailsSets.flat()
            if (combinedDetails.length === 0) {
                notify(t("REFERENCE_DETAIL_EMPTY", "Chứng từ tham chiếu chưa có chi tiết"), "warning", 2500)
                return
            }

            const currentDetails = getActiveDetailRows(draftRef.current.DETAILS as DetailRow[])
            const normalizedCombinedDetails = combinedDetails.map((detail) => ({
                ...detail,
                ROW_KEY: createRowKey(),
                SORT: 1,
            })) as DetailRow[]

            const finalDetails =
                mode === "replace"
                    ? normalizedCombinedDetails
                    : [
                        ...currentDetails.map((detail, index) => ({
                            ...detail,
                            ROW_KEY: getDetailRowKey(detail, index),
                            SORT: index + 1,
                        })),
                        ...normalizedCombinedDetails.map((detail, index) => ({
                            ...detail,
                            ROW_KEY: createRowKey(),
                            SORT: currentDetails.length + index + 1,
                        })),
                    ]

            const finalActiveDetails = getActiveDetailRows(finalDetails)
            setDraft((current) =>
                normalizeDraftForEditor(
                    {
                        ...current,
                        DETAILS: finalDetails,
                        DETAIL_COUNT: finalActiveDetails.length,
                        AMOUNT: calculateChitAmount(finalActiveDetails),
                    },
                    chitType,
                ),
            )
            setMultiReferencePopupVisible(false)

            notify(
                t(
                    mode === "append" ? "REFERENCE_APPENDED" : "REFERENCE_APPLIED",
                    mode === "append" ? "Đã thêm tham chiếu" : "Đã áp dụng chứng từ tham chiếu",
                ),
                "success",
                2500,
            )
        },
        [
            buildMultipleReferenceDetails,
            chitType,
            draftRef,
            openLinkedAccountingVoucher,
            pendingUnlinkReferenceSourceIds,
            resolveReferenceApplyMode,
            setDraft,
            t,
        ],
    )

    const ensureAccountingInventoryLinksForSave = useCallback(
        async (details: DetailRow[]): Promise<DetailRow[]> => {
            if (!referenceConfig || !isInventoryLinkedAccountingVoucherType(chitType)) {
                return details
            }

            const inputLinked = isInventoryInputLinkedAccountingVoucherType(chitType)
            const missingDetailIds = details
                .filter((detail) => !detail.ISDEL)
                .filter((detail) => {
                    const detailId = Number(detail.CHITDETAIL_ID ?? 0)
                    if (!Number.isFinite(detailId) || detailId <= 0) {
                        return false
                    }

                    return inputLinked
                        ? getDetailInventoryInputs(detail).length === 0
                        : getDetailInventoryOutputs(detail).length === 0
                })
                .map((detail) => Number(detail.CHITDETAIL_ID ?? 0))
                .filter((detailId) => detailId > 0)

            if (missingDetailIds.length === 0) {
                return details
            }

            if (inputLinked) {
                const inputs = await getInventoryInputs(referenceConfig.ledger, referenceConfig.chitType, missingDetailIds)
                const normalizedInputs = inputs.map((input, index) =>
                    normalizeInventoryInputApi(input, `${input.INPUT_ID ?? index + 1}`),
                )
                return attachInventoryInputsToPurchaseDetails(details, normalizedInputs) as DetailRow[]
            }

            const outputs = await getInventoryOutputs(referenceConfig.ledger, referenceConfig.chitType, missingDetailIds)
            const normalizedOutputs = outputs.map((output, index) =>
                normalizeInventoryOutputApi(output, `${output.OUTPUT_ID ?? index + 1}`),
            )
            return attachInventoryOutputsToSalesDetails(details, normalizedOutputs) as DetailRow[]
        },
        [chitType, referenceConfig],
    )

    return {
        referenceConfig,
        referenceEnabled,
        linkedReferenceSourceIds,
        multiReferencePopupVisible,
        selectedReferenceSourceIds,
        pendingUnlinkReferenceSourceIds,
        openMultiReferencePopup,
        closeMultiReferencePopup,
        handleReferenceSelected,
        handleConfirmMultiReferenceSelection,
        resetReferenceState,
        ensureAccountingInventoryLinksForSave,
    }
}
