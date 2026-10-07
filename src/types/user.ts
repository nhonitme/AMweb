export interface User {
  id: string
  userId: string
  name: string
  costCenterCode: string
  permission: "admin" | "user" | "viewer"
  phone: string
  issueDate: string
  notes: string
  password?: string
  password2?: string
  lockOption: "cannot_lock" | "can_lock"
  cannotDeleteLinked: boolean
  cannotEditLocked: boolean
  cannotAddLock: boolean
  editReservedName: boolean
  showDocumentsByUser: boolean
  permissions: string[]
  createdDate: string
}