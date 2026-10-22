import { useSyncExternalStore } from "react";
import { isPublicAppPath } from "@/lib/publicRoutes";

export const MOBILE_DEVICE_MESSAGE = "AMNote không hỗ trợ sử dụng trên điện thoại. Vui lòng truy cập bằng máy tính.";
let blocked = false;
const listeners = new Set<() => void>();

export function isMobileDeviceError(error: unknown): boolean {
  const response = (error as { response?: { status?: number; data?: Record<string, unknown> } } | null)?.response;
  const payload = response?.data;
  const data = (payload?.Data ?? payload?.data) as Record<string, unknown> | undefined;
  return response?.status === 403 && (data?.Code ?? data?.code) === "MOBILE_DEVICE_BLOCKED";
}

export function handleMobileDeviceError(error: unknown): boolean {
  if (!isMobileDeviceError(error)) return false;
  if (error instanceof Error) error.message = MOBILE_DEVICE_MESSAGE;
  if (!blocked && !isPublicAppPath()) {
    blocked = true;
    listeners.forEach(listener => listener());
  }
  return true;
}

export function isMobileDeviceBlocked(): boolean { return blocked; }

export function MobileDeviceNotice() {
  const visible = useSyncExternalStore(
    listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => blocked,
    () => false,
  );
  if (!visible || isPublicAppPath()) return null;
  return <div role="alert" className="fixed inset-x-0 top-0 z-[100000] border-b border-red-200 bg-red-50 px-4 py-4 text-center text-sm font-medium text-red-800">{MOBILE_DEVICE_MESSAGE}</div>;
}
