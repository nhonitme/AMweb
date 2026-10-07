import { getCurrentCompanyCd, getCurrentUserId } from "@/lib/login"

export function getQueryCompanyCd(): string {
  return getCurrentCompanyCd()
}

export function getQueryUserId(): string {
  return getCurrentUserId()
}
