import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useUserListQuery, useUserMutations, useMyProfileInvalidate } from "@/hooks/queries/adminQueries"
import { useMasterListLoadError } from "@/hooks/queries/master/masterQueryHelpers"
import { LoadPanel } from "devextreme-react"
import { confirm } from "devextreme/ui/dialog"
import notify from "devextreme/ui/notify"
import type dxDataGrid from "devextreme/ui/data_grid"

import { GridToolbar } from "@/components/toolbar/GridToolbar"
import MasterDataPageLayout from "@/components/datagrid/MasterDataPageLayout"
import { getApiErrorMessage } from "@/api/apiTypes"
import { type SysCode } from "@/api/sysCodeService"
import { useSysCodes } from "@/lib/sysCodeContext"
import { getUserPermissions, updateUserPermission } from "@/api/systemApi"
import { fetchMenuList } from "@/api/menuApi"
import DxPage from "@/dx/DxPage"
import { LanguageContext } from "@/lib/i18nLoader"
import { getCurrentCompanyCd, getCurrentUserId, getCurrentUserPkId } from "@/lib/login"
import type { MenuItem } from "@/types/menu"
import type { UserInfo, UserInfoApi } from "@/types/userInfo"
import { PermissionsDialog } from "./PermissionsDialog"
import UserDetailPanel, { type UserDetailMode } from "./UserDetailPanel"
import UserListPanel from "./UserListPanel"
import {
  getChangedPermissionRows,
  hasPermissionChanges,
  mergePermissionsWithMenuTree,
  normalizePermissionRows,
  type PermissionRow,
} from "./permissionUtils"
import {
  createDefaultUserInfo,
  deriveRoleCode,
  mapUserInfoToApiPayload,
  normalizeUserInfoRows,
} from "./userInfoUtils"

const clonePermissionRows = (rows: PermissionRow[]): PermissionRow[] => rows.map((row) => ({ ...row }))
const cloneUser = (user: UserInfo): UserInfo => ({ ...user })
const hasText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0

const EDITABLE_COMPARE_FIELDS: Array<keyof UserInfo> = [
  "USERID",
  "PASSWD",
  "USERNM",
  "EMAIL",
  "MOBILE_NO",
  "AVATAR_URL",
  "USERLV",
  "DEFAULT_YN",
  "IS_ACTIVE",
]

function isUserDraftDirty(draft: UserInfo | null, baseline: UserInfo | null, mode: UserDetailMode): boolean {
  if (!draft || mode === "idle") {
    return false
  }

  if (mode === "create") {
    const empty = createDefaultUserInfo(draft.COMPANY_CD || getCurrentCompanyCd())
    return EDITABLE_COMPARE_FIELDS.some((field) => {
      if (field === "PASSWD") {
        return hasText(draft.PASSWD)
      }
      return draft[field] !== empty[field]
    })
  }

  if (!baseline) {
    return false
  }

  return EDITABLE_COMPARE_FIELDS.some((field) => {
    if (field === "PASSWD") {
      return hasText(draft.PASSWD)
    }
    return draft[field] !== baseline[field]
  })
}

export default function UserManagementPage() {
  const [permModalOpen, setPermModalOpen] = useState(false)
  const [permissions, setPermissions] = useState<PermissionRow[]>([])
  const [initialPermissions, setInitialPermissions] = useState<PermissionRow[]>([])
  const [permissionMenuItems, setPermissionMenuItems] = useState<MenuItem[]>([])
  const [permLoading, setPermLoading] = useState(false)
  const [userLevelCodes, setUserLevelCodes] = useState<SysCode[]>([])
  const [canOpenPermissionDialog, setCanOpenPermissionDialog] = useState(false)
  const { getCodesByType } = useSysCodes()
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null)
  const [formDraft, setFormDraft] = useState<UserInfo | null>(null)
  const [detailMode, setDetailMode] = useState<UserDetailMode>("idle")
  const [detailSaving, setDetailSaving] = useState(false)
  const [listSearchText, setListSearchText] = useState("")
  const gridRef = useRef<dxDataGrid | null>(null)
  const selectedUserRef = useRef<UserInfo | null>(null)
  const formDraftRef = useRef<UserInfo | null>(null)
  const detailModeRef = useRef<UserDetailMode>("idle")
  const hasAutoSelectedRef = useRef(false)

  const { lang, translate } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string
    lang: string
  }

  const {
    data: userRows = [],
    isLoading,
    isFetching,
    isError,
    error: loadError,
    refetch: refetchUsers,
  } = useUserListQuery(lang)
  const { createMutation, updateMutation, deleteMutation, invalidate } = useUserMutations()
  const invalidateMyProfile = useMyProfileInvalidate()
  const loading = isLoading || isFetching
  const users = useMemo(() => normalizeUserInfoRows(userRows), [userRows])

  const t = useCallback(
    (key: string, fallback?: string) => (translate ? translate(key, fallback || key) : fallback || key),
    [translate],
  )

  useMasterListLoadError(isError, loadError, t, "Failed to load user info")

  useEffect(() => {
    selectedUserRef.current = selectedUser
  }, [selectedUser])

  useEffect(() => {
    formDraftRef.current = formDraft
  }, [formDraft])

  useEffect(() => {
    detailModeRef.current = detailMode
  }, [detailMode])

  const isDirty = useMemo(
    () => isUserDraftDirty(formDraft, selectedUser, detailMode),
    [detailMode, formDraft, selectedUser],
  )

  const loadCurrentUserPermissions = useCallback(async () => {
    const userId = getCurrentUserId()
    const companyCd = getCurrentCompanyCd()

    if (!userId || !companyCd) {
      setCanOpenPermissionDialog(false)
      return
    }

    try {
      const result = await getUserPermissions(undefined, userId)
      const rows = Array.isArray(result) ? normalizePermissionRows(result) : []
      setCanOpenPermissionDialog(rows.some((row) => row.CAN_VIEW || row.CAN_ADD || row.CAN_EDIT))
    } catch (error) {
      console.error("Failed to load current user permissions", error)
      setCanOpenPermissionDialog(false)
    }
  }, [])

  const hasLoadedUserPermissionsRef = useRef(false)

  useEffect(() => {
    setUserLevelCodes(getCodesByType("USER_LEVEL") ?? [])
  }, [getCodesByType])

  useEffect(() => {
    if (hasLoadedUserPermissionsRef.current) return
    hasLoadedUserPermissionsRef.current = true
    void loadCurrentUserPermissions()
  }, [loadCurrentUserPermissions])

  const applySelectedUser = useCallback((user: UserInfo | null) => {
    if (!user) {
      setSelectedUser(null)
      setFormDraft(null)
      setDetailMode("idle")
      return
    }

    const next = cloneUser({ ...user, PASSWD: "" })
    setSelectedUser(next)
    setFormDraft(cloneUser(next))
    setDetailMode("view-edit")
  }, [])

  const confirmDiscardIfDirty = useCallback(async () => {
    const dirty = isUserDraftDirty(
      formDraftRef.current,
      selectedUserRef.current,
      detailModeRef.current,
    )
    if (!dirty) {
      return true
    }

    return confirm(
      t("USER_DETAIL_DISCARD_CONFIRM", "Discard unsaved changes?"),
      t("MSG_CONFIRM", "Confirm"),
    )
  }, [t])

  useEffect(() => {
    if (hasAutoSelectedRef.current || loading || users.length === 0) {
      return
    }

    if (detailModeRef.current === "create") {
      return
    }

    hasAutoSelectedRef.current = true
    applySelectedUser(users[0])
  }, [applySelectedUser, loading, users])

  useEffect(() => {
    if (detailMode !== "view-edit" || !selectedUser?.USER_PK_ID) {
      return
    }

    const refreshed = users.find((row) => row.USER_PK_ID === selectedUser.USER_PK_ID)
    if (!refreshed) {
      return
    }

    const dirty = isUserDraftDirty(formDraftRef.current, selectedUserRef.current, "view-edit")
    if (dirty) {
      return
    }

    applySelectedUser(refreshed)
  }, [applySelectedUser, detailMode, selectedUser?.USER_PK_ID, users])

  const loadPermissions = useCallback(
    async (userId?: string) => {
      if (!userId || !getCurrentCompanyCd()) {
        notify(t("MSG_SELECT_USER_FIRST", "Hãy chọn một người dùng trước"), "warning", 3000)
        return
      }

      setPermLoading(true)

      try {
        const [result, menuItems] = await Promise.all([
          getUserPermissions(undefined, userId),
          fetchMenuList(),
        ])
        const apiRows = Array.isArray(result) ? normalizePermissionRows(result) : []
        const { permissionRows } = mergePermissionsWithMenuTree(
          Array.isArray(menuItems) ? menuItems : [],
          apiRows,
          t,
        )
        const snapshot = clonePermissionRows(permissionRows)

        setPermissionMenuItems(Array.isArray(menuItems) ? menuItems : [])
        setPermissions(clonePermissionRows(snapshot))
        setInitialPermissions(snapshot)
        setPermModalOpen(snapshot.length > 0)
      } catch (error) {
        console.error("Failed to load user permissions", error)
        notify(getApiErrorMessage(error, t("LOAD_FAILED", "Tải thất bại")), "error", 5000)
      } finally {
        setPermLoading(false)
      }
    },
    [t],
  )

  const permissionsChanged = useMemo(
    () => hasPermissionChanges(permissions, initialPermissions),
    [initialPermissions, permissions],
  )

  const handleSavePermissions = useCallback(async () => {
    if (!selectedUser) {
      return
    }

    if (!permissionsChanged) {
      setPermModalOpen(false)
      return
    }

    const changedRows = getChangedPermissionRows(permissions, initialPermissions)
    if (!changedRows.length) {
      setPermModalOpen(false)
      return
    }

    setPermLoading(true)

    try {
      const modifierUserId = getCurrentUserId()
      await Promise.all(
        changedRows.map((row) =>
          updateUserPermission({
            USERID: selectedUser.USERID,
            MENU_CODE: row.MENU_CODE,
            CAN_VIEW: row.CAN_VIEW ? "1" : "0",
            CAN_ADD: row.CAN_ADD ? "1" : "0",
            CAN_EDIT: row.CAN_EDIT ? "1" : "0",
            CAN_DELETE: row.CAN_DELETE ? "1" : "0",
            CAN_PRINT: row.CAN_PRINT ? "1" : "0",
            CAN_EXPORT: row.CAN_EXPORT ? "1" : "0",
            CAN_IMPORT: row.CAN_IMPORT ? "1" : "0",
            CAN_APPROVE: row.CAN_APPROVE ? "1" : "0",
            USERID_MODIFY: modifierUserId,
          }),
        ),
      )

      notify(t("MSG_EDIT_SUCCESS", "Updated successfully"), "success", 3000)
      await loadPermissions(selectedUser.USERID)
      if (selectedUser.USERID === getCurrentUserId()) {
        await loadCurrentUserPermissions()
      }
    } catch (error) {
      console.error("Save permissions failed", error)
      notify(getApiErrorMessage(error, t("UPDATE_FAILED", "Cập nhật thất bại")), "error", 5000)
    } finally {
      setPermLoading(false)
    }
  }, [initialPermissions, loadCurrentUserPermissions, loadPermissions, permissions, permissionsChanged, selectedUser, t])

  const handleCancelPermissions = useCallback(() => {
    setPermissions(clonePermissionRows(initialPermissions))
    setPermModalOpen(false)
  }, [initialPermissions])

  const buildCreatePayload = useCallback((data: UserInfo): Partial<UserInfoApi> => {
    const currentCompanyCd = getCurrentCompanyCd()
    const nextRow: UserInfo = {
      ...createDefaultUserInfo(currentCompanyCd),
      ...data,
      COMPANY_CD: data.COMPANY_CD || currentCompanyCd,
      USERID: typeof data.USERID === "string" ? data.USERID.trim() : "",
      USERNM: typeof data.USERNM === "string" ? data.USERNM.trim() : "",
      ROLE_CODE: deriveRoleCode(data.USERLV),
    }

    return mapUserInfoToApiPayload(nextRow)
  }, [])

  const buildUpdatePayload = useCallback((draft: UserInfo, baseline: UserInfo): Partial<UserInfoApi> => {
    const currentCompanyCd = baseline.COMPANY_CD || getCurrentCompanyCd()
    const mergedRow: UserInfo = {
      ...createDefaultUserInfo(currentCompanyCd),
      ...baseline,
      ...draft,
      USER_PK_ID: baseline.USER_PK_ID,
      COMPANY_CD: currentCompanyCd,
      USERID: typeof draft.USERID === "string" ? draft.USERID.trim() : baseline.USERID,
      USERNM: typeof draft.USERNM === "string" ? draft.USERNM.trim() : baseline.USERNM,
      ROLE_CODE: deriveRoleCode(draft.USERLV),
    }

    const payload = mapUserInfoToApiPayload(mergedRow)
    if (!hasText(draft.PASSWD)) {
      delete payload.PASSWD
    }
    return payload
  }, [])

  const handleSelectUser = useCallback(
    async (user: UserInfo) => {
      const currentPk = selectedUserRef.current?.USER_PK_ID
      if (
        detailModeRef.current === "view-edit" &&
        currentPk != null &&
        user.USER_PK_ID === currentPk
      ) {
        return
      }

      const canContinue = await confirmDiscardIfDirty()
      if (!canContinue) {
        return
      }

      applySelectedUser(user)
    },
    [applySelectedUser, confirmDiscardIfDirty],
  )

  const handleToolbarAdd = useCallback(async () => {
    const canContinue = await confirmDiscardIfDirty()
    if (!canContinue) {
      return
    }

    const draft = createDefaultUserInfo(getCurrentCompanyCd())
    setSelectedUser(null)
    setFormDraft(draft)
    setDetailMode("create")
  }, [confirmDiscardIfDirty])

  const handleDetailCancel = useCallback(async () => {
    if (detailMode === "create") {
      const canContinue = isDirty
        ? await confirm(
            t("USER_DETAIL_DISCARD_CONFIRM", "Discard unsaved changes?"),
            t("MSG_CONFIRM", "Confirm"),
          )
        : true
      if (!canContinue) {
        return
      }

      if (users.length > 0) {
        applySelectedUser(users[0])
      } else {
        applySelectedUser(null)
      }
      return
    }

    if (selectedUser) {
      setFormDraft(cloneUser({ ...selectedUser, PASSWD: "" }))
    }
  }, [applySelectedUser, detailMode, isDirty, selectedUser, t, users])

  const handleDetailSave = useCallback(async () => {
    if (!formDraft || detailMode === "idle") {
      return
    }

    if (detailMode === "create") {
      if (!hasText(formDraft.USERID) || !hasText(formDraft.USERNM) || !hasText(formDraft.PASSWD)) {
        notify(
          t("USER_DETAIL_REQUIRED", "User ID, name and password are required."),
          "warning",
          3000,
        )
        return
      }

      setDetailSaving(true)
      try {
        const payload = buildCreatePayload(formDraft)
        const created = await createMutation.mutateAsync(payload)
        notify(t("MSG_INSERT_SUCCESS", "Created successfully"), "success", 3000)
        const refreshed = await refetchUsers()
        const list = normalizeUserInfoRows(refreshed.data ?? [])
        const createdPk =
          typeof created?.data?.USER_PK_ID === "number" ? created.data.USER_PK_ID : null
        const matched =
          (createdPk != null ? list.find((row) => row.USER_PK_ID === createdPk) : undefined) ??
          list.find((row) => row.USERID === formDraft.USERID.trim())
        applySelectedUser(matched ?? null)
      } catch (error) {
        console.error("Create user error", error)
        notify(getApiErrorMessage(error, t("INSERT_FAILED", "Thêm mới thất bại")), "error", 3000)
      } finally {
        setDetailSaving(false)
      }
      return
    }

    if (!selectedUser?.USER_PK_ID) {
      return
    }

    if (!hasText(formDraft.USERNM)) {
      notify(t("MSG_MUST_ITEM", "User name is required."), "warning", 3000)
      return
    }

    setDetailSaving(true)
    try {
      const payload = buildUpdatePayload(formDraft, selectedUser)
      await updateMutation.mutateAsync(payload)
      notify(t("MSG_EDIT_SUCCESS", "Updated successfully"), "success", 3000)
      const refreshed = await refetchUsers()
      const list = normalizeUserInfoRows(refreshed.data ?? [])
      const matched = list.find((row) => row.USER_PK_ID === selectedUser.USER_PK_ID)
      if (matched) {
        applySelectedUser(matched)
      }
    } catch (error) {
      console.error("Update user error", error)
      notify(getApiErrorMessage(error, t("UPDATE_FAILED", "Cập nhật thất bại")), "error", 3000)
    } finally {
      setDetailSaving(false)
    }
  }, [
    applySelectedUser,
    buildCreatePayload,
    buildUpdatePayload,
    createMutation,
    detailMode,
    formDraft,
    refetchUsers,
    selectedUser,
    t,
    updateMutation,
  ])

  const handleToolbarDelete = useCallback(async () => {
    const userPkId = selectedUser?.USER_PK_ID
    if (!userPkId) {
      notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2000)
      return
    }

    const currentUserPkId = getCurrentUserPkId()
    if (currentUserPkId > 0 && userPkId === currentUserPkId) {
      notify(
        t("USER_DELETE_SELF_FORBIDDEN", "You cannot delete your own account."),
        "warning",
        3000,
      )
      return
    }

    const confirmText = t(
      "MSG_CONFIRM_DELETE_RECORD",
      "Are you sure you want to delete {0} record?",
    ).replace("{0}", "1")

    const isConfirmed = await confirm(confirmText, t("MSG_CONFIRM_DELETE", "Confirm delete"))
    if (!isConfirmed) {
      return
    }

    try {
      await deleteMutation.mutateAsync([userPkId])
      notify(t("DELETE_SUCCESS", "Deleted successfully"), "success", 3000)
      const refreshed = await refetchUsers()
      const list = normalizeUserInfoRows(refreshed.data ?? [])
      applySelectedUser(list[0] ?? null)
    } catch (error) {
      console.error("Delete user error", error)
      notify(getApiErrorMessage(error, t("DELETE_FAILED", "Xóa thất bại")), "error", 3000)
    }
  }, [applySelectedUser, deleteMutation, refetchUsers, selectedUser, t])

  const handleRefresh = useCallback(async () => {
    await refetchUsers()
  }, [refetchUsers])

  const permissionUserLabel = selectedUser
    ? selectedUser.USERNM
      ? `${selectedUser.USERNM} (${selectedUser.USERID})`
      : selectedUser.USERID
    : undefined

  return (
    <DxPage>
      <MasterDataPageLayout
        toolbar={
          <GridToolbar
            gridRef={gridRef}
            onRefresh={handleRefresh}
            onAdd={handleToolbarAdd}
            onDelete={handleToolbarDelete}
            showImport={false}
            showExportPdf={false}
            showExportXlsx={false}
            showColumnChooser={false}
            deleteDisabled={!selectedUser || detailMode === "create"}
            onSearchStateChange={(value) => setListSearchText(value)}
            customItems={[
              {
                key: "permissions",
                icon: "key",
                text: "",
                hint: t("USER_PERMISSION_TOOLTIP", "User permissions"),
                stylingMode: "text",
                showText: "none",
                disabled: !selectedUser || !canOpenPermissionDialog || detailMode === "create",
                onClick: () => void loadPermissions(selectedUser?.USERID),
              },
            ]}
          />
        }
      >
        <div className="flex h-full min-h-0 flex-col gap-3 lg:flex-row lg:gap-4">
          <div className="h-[42vh] min-h-[260px] w-full shrink-0 lg:h-full lg:w-[320px] xl:w-[360px]">
            <UserListPanel
              users={users}
              selectedUserPkId={selectedUser?.USER_PK_ID ?? null}
              searchText={listSearchText}
              userLevelCodes={userLevelCodes}
              creating={detailMode === "create"}
              emptyText={t("USER_LIST_EMPTY", "Không tìm thấy người dùng.")}
              countLabel={t("USER_LIST_COUNT", "{0} người dùng")}
              inactiveLabel={t("INACTIVE", "Ngưng")}
              onSelect={(user) => {
                void handleSelectUser(user)
              }}
              translate={t}
            />
          </div>

          <div className="min-h-[360px] min-w-0 flex-1 overflow-hidden">
            <UserDetailPanel
              mode={detailMode}
              value={formDraft}
              isDirty={isDirty}
              saving={detailSaving}
              userLevelCodes={userLevelCodes}
              canOpenPermissions={Boolean(selectedUser && canOpenPermissionDialog)}
              onChange={setFormDraft}
              onAvatarUploaded={(avatarUrl) => {
                setSelectedUser((current) =>
                  current ? { ...current, AVATAR_URL: avatarUrl } : current,
                )
                setFormDraft((current) =>
                  current ? { ...current, AVATAR_URL: avatarUrl } : current,
                )
                void invalidate()
                if (selectedUser?.USER_PK_ID != null && selectedUser.USER_PK_ID === getCurrentUserPkId()) {
                  void invalidateMyProfile()
                }
              }}
              onSave={() => {
                void handleDetailSave()
              }}
              onCancel={() => {
                void handleDetailCancel()
              }}
              onOpenPermissions={() => {
                void loadPermissions(selectedUser?.USERID)
              }}
            />
          </div>
        </div>

        <LoadPanel
          shadingColor="rgba(0, 0, 0, 0.4)"
          visible={loading || detailSaving}
          showIndicator={true}
          shading={true}
          showPane={true}
        />

        <PermissionsDialog
          open={permModalOpen}
          onOpenChange={setPermModalOpen}
          title={t("USER_PERMISSION_TITLE", "Phân quyền")}
          userLabel={permissionUserLabel}
          permissions={permissions}
          menuItems={permissionMenuItems}
          onChange={setPermissions}
          onCancel={handleCancelPermissions}
          onSave={handleSavePermissions}
          canSave={permissionsChanged}
          loading={permLoading}
          userLevel={selectedUser?.USERLV}
          userLevelCodes={userLevelCodes}
        />
      </MasterDataPageLayout>
    </DxPage>
  )
}
