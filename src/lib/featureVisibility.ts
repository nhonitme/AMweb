export const SHOW_NOTIFICATIONS = false;
export const SHOW_USER_GUIDE = false;
export const SHOW_DASHBOARD = true;

export function canShowUiGuidelines(_companyCd?: string | null): boolean {
  return import.meta.env.DEV;
}
