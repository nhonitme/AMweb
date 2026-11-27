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
import { useMenuTreeInvalidate } from "@/hooks/queries/useMenuTreeQuery"
import { fetchMenuList } from "@/api/menuApi"
import DxPage from "@/dx/DxPage"
import { LanguageContext } from "@/lib/i18nLoader"
import { getCurrentCompanyCd, getCurrentUserId, getCurrentUserPkId } from "@/lib/login"
import type { MenuItem } from "@/types/menu"
import type { UserInfo, UserInfoApi } from "@/types/userInfo"
import { PermissionsDialog } from "./PermissionsDialog"
import UserCreatePopup from "./UserCreatePopup"
import UserDetailPanel from "./UserDetailPanel"
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

function isUserDraftDirty(draft: UserInfo | null, baseline: UserInfo | null): boolean {
  if (!draft || !baseline) {
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
  const [detailSaving, setDetailSaving] = useState(false)
  const [createDraft, setCreateDraft] = useState<UserInfo | null>(null)
  const [createSaving, setCreateSaving] = useState(false)
  const [listSearchText, setListSearchText] = useState("")
  const gridRef = useRef<dxDataGrid | null>(null)
  const selectedUserRef = useRef<UserInfo | null>(null)
  const formDraftRef = useRef<UserInfo | null>(null)
  const hasAutoSelectedRef = useRef(false)
  const createActionRef = useRef<"discard" | "save" | null>(null)

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

  const isDirty = useMemo(
    () => isUserDraftDirty(formDraft, selectedUser),
    [formDraft, selectedUser],
  )
  const isCreateDirty = Boolean(createDraft && isUserDraftDirty(createDraft, createDefaultUserInfo(createDraft.COMPANY_CD)))

  const invalidateMenuTree = useMenuTreeInvalidate()

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
      return
    }

    const next = cloneUser({ ...user, PASSWD: "" })
    setSelectedUser(next)
    setFormDraft(cloneUser(next))
  }, [])

  const confirmDiscardIfDirty = useCallback(async () => {
    const dirty = isUserDraftDirty(
      formDraftRef.current,
      selectedUserRef.current,
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

    hasAutoSelectedRef.current = true
    applySelectedUser(users[0])
  }, [applySelectedUser, loading, users])

  useEffect(() => {
    if (!selectedUser?.USER_PK_ID) {
      return
    }

    const refreshed = users.find((row) => row.USER_PK_ID === selectedUser.USER_PK_ID)
    if (!refreshed) {
      return
    }

    const dirty = isUserDraftDirty(formDraftRef.current, selectedUserRef.current)
    if (dirty) {
      return
    }

    applySelectedUser(refreshed)
  }, [applySelectedUser, selectedUser?.USER_PK_ID, users])

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
            RESET_TO_DEFAULT: row.RESET_TO_DEFAULT === true,
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
        await invalidateMenuTree()
      }
    } catch (error) {
      console.error("Save permissions failed", error)
      notify(getApiErrorMessage(error, t("UPDATE_FAILED", "Cập nhật thất bại")), "error", 5000)
    } finally {
      setPermLoading(false)
    }
  }, [initialPermissions, invalidateMenuTree, loadCurrentUserPermissions, loadPermissions, permissions, permissionsChanged, selectedUser, t])

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
    if (createDraft || detailSaving) {
      return
    }

    const canContinue = await confirmDiscardIfDirty()
    if (!canContinue) {
      return
    }

    if (isUserDraftDirty(formDraftRef.current, selectedUserRef.current)) {
      const user = selectedUserRef.current
      setFormDraft(user ? cloneUser(user) : null)
    }
    setCreateDraft(createDefaultUserInfo(getCurrentCompanyCd()))
  }, [confirmDiscardIfDirty, createDraft, detailSaving])

  const handleCreateCancel = useCallback(async () => {
    if (!createDraft || createActionRef.current) {
      return
    }

    createActionRef.current = "discard"
    try {
      if (!isCreateDirty || await confirm(
        t("USER_DETAIL_DISCARD_CONFIRM", "Discard unsaved changes?"),
        t("MSG_CONFIRM", "Confirm"),
      )) {
        setCreateDraft(null)
      }
    } finally {
      createActionRef.current = null
    }
  }, [createDraft, isCreateDirty, t])

  const handleCreateSave = useCallback(async () => {
    if (!createDraft || createActionRef.current) {
      return
    }

    if (!hasText(createDraft.USERID) || !hasText(createDraft.USERNM) || !hasText(createDraft.PASSWD)) {
      notify(t("USER_DETAIL_REQUIRED", "Cần nhập tên đăng nhập, họ tên và mật khẩu."), "warning", 3000)
      return
    }

    createActionRef.current = "save"
    setCreateSaving(true)
    try {
      const created = await createMutation.mutateAsync(buildCreatePayload(createDraft))
      const refreshed = await refetchUsers()
      const list = normalizeUserInfoRows(refreshed.data ?? [])
      const createdPk = created?.data?.USER_PK_ID
      const matched =
        (createdPk != null ? list.find((row) => row.USER_PK_ID === createdPk) : undefined) ??
        list.find((row) => row.USERID === createDraft.USERID.trim())
      if (matched) {
        applySelectedUser(matched)
      }
      setCreateDraft(null)
      notify(t("MSG_INSERT_SUCCESS", "Created successfully"), "success", 3000)
    } catch (error) {
      console.error("Create user error", error)
      notify(getApiErrorMessage(error, t("INSERT_FAILED", "Thêm mới thất bại")), "error", 3000)
    } finally {
      createActionRef.current = null
      setCreateSaving(false)
    }
  }, [applySelectedUser, buildCreatePayload, createDraft, createMutation, refetchUsers, t])

  const handleDetailCancel = useCallback(() => {
    if (selectedUser) {
      setFormDraft(cloneUser({ ...selectedUser, PASSWD: "" }))
    }
  }, [selectedUser])

  const handleDetailSave = useCallback(async () => {
    if (!formDraft || !selectedUser?.USER_PK_ID) {
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
    buildUpdatePayload,
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
        loading={loading}
        loadError={isError}
        toolbar={
          <GridToolbar
            gridRef={gridRef}
            onRefresh={handleRefresh}
            onAdd={handleToolbarAdd}
            onDelete={handleToolbarDelete}
            showImport={false}
            showExportPdf={false}
            showColumnChooser={false}
            deleteDisabled={!selectedUser || Boolean(createDraft) || createSaving}
            onSearchStateChange={(value) => setListSearchText(value)}
            customItems={[
              {
                key: "permissions",
                icon: "key",
                text: "",
                hint: t("USER_PERMISSION_TOOLTIP", "User permissions"),
                stylingMode: "text",
                showText: "none",
                disabled: !selectedUser || !canOpenPermissionDialog || Boolean(createDraft) || createSaving,
                onClick: () => void loadPermissions(selectedUser?.USERID),
              },
            ]}
          />
        }
        overlays={
          <UserCreatePopup
            value={createDraft}
            isDirty={isCreateDirty}
            saving={createSaving}
            userLevelCodes={userLevelCodes}
            onChange={setCreateDraft}
            onSave={() => { void handleCreateSave() }}
            onCancel={() => { void handleCreateCancel() }}
            translate={t}
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
          visible={!createDraft && (loading || detailSaving || createSaving)}
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
