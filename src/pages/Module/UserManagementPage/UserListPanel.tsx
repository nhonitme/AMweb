import { useMemo } from "react"

import type { SysCode } from "@/api/sysCodeService"
import { getSysCodeDisplayText } from "@/lib/sysCodeUtils"
import type { UserInfo } from "@/types/userInfo"
import { useUserAvatarThumbSrc } from "./useUserAvatarThumbSrc"

type UserListPanelProps = {
  users: UserInfo[]
  selectedUserPkId: number | null
  searchText?: string
  userLevelCodes?: SysCode[]
  creating?: boolean
  emptyText: string
  countLabel: string
  inactiveLabel: string
  onSelect: (user: UserInfo) => void
  translate: (key: string, fallback?: string) => string
}

function getInitials(user: UserInfo): string {
  const source = (user.USERNM || user.USERID || "?").trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

function resolveLevelLabel(
  user: UserInfo,
  userLevelCodes: SysCode[],
  translate: (key: string, fallback?: string) => string,
): string {
  const matched = userLevelCodes.find((item) => String(item.CODE_CD) === String(user.USERLV))
  if (matched) {
    return getSysCodeDisplayText(matched, translate)
  }
  return user.ROLE_CODE || String(user.USERLV || "")
}

function UserListAvatar({
  user,
  selected,
}: {
  user: UserInfo
  selected: boolean
}) {
  const imageSrc = useUserAvatarThumbSrc({
    userPkId: user.USER_PK_ID,
    storedPath: user.AVATAR_URL,
  })

  return (
    <div
      className={[
        "flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold",
        selected ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-700",
      ].join(" ")}
    >
      {imageSrc ? (
        <img src={imageSrc} alt="" className="h-10 w-10 object-cover" />
      ) : (
        getInitials(user)
      )}
    </div>
  )
}

export default function UserListPanel({
  users,
  selectedUserPkId,
  searchText = "",
  userLevelCodes = [],
  creating = false,
  emptyText,
  countLabel,
  inactiveLabel,
  onSelect,
  translate,
}: UserListPanelProps) {
  const filteredUsers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    if (!keyword) {
      return users
    }

    return users.filter((user) => {
      const haystack = [user.USERID, user.USERNM, user.EMAIL, user.MOBILE_NO, user.ROLE_CODE]
        .join(" ")
        .toLowerCase()
      return haystack.includes(keyword)
    })
  }, [searchText, users])

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-[#f7f8fa]">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="text-sm font-semibold text-slate-800">
          {translate("USER_LIST_TITLE", "Danh sách người dùng")}
        </div>
        <div className="text-xs text-slate-500">{countLabel.replace("{0}", String(filteredUsers.length))}</div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {filteredUsers.length === 0 ? (
          <div className="flex h-full min-h-[160px] items-center justify-center px-4 text-center text-sm text-slate-500">
            {emptyText}
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {filteredUsers.map((user) => {
              const selected =
                !creating &&
                user.USER_PK_ID != null &&
                selectedUserPkId != null &&
                user.USER_PK_ID === selectedUserPkId
              const levelLabel = resolveLevelLabel(user, userLevelCodes, translate)

              return (
                <li key={user.USER_PK_ID ?? user.USERID}>
                  <button
                    type="button"
                    onClick={() => onSelect(user)}
                    className={[
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition",
                      selected
                        ? "bg-white shadow-sm ring-1 ring-slate-200"
                        : "hover:bg-white/80",
                    ].join(" ")}
                  >
                    <UserListAvatar user={user} selected={selected} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {user.USERNM || user.USERID}
                        </div>
                        {!user.IS_ACTIVE ? (
                          <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-rose-600">
                            {inactiveLabel}
                          </span>
                        ) : null}
                      </div>
                      <div className="truncate text-xs text-slate-500">{user.USERID}</div>
                      <div className="mt-1 truncate text-[11px] text-slate-600">{levelLabel}</div>
                    </div>

                    <span
                      className={[
                        "h-2 w-2 flex-shrink-0 rounded-full",
                        user.IS_ACTIVE ? "bg-emerald-500" : "bg-slate-300",
                      ].join(" ")}
                      aria-hidden
                    />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
