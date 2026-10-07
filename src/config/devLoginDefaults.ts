export type DevLoginDefaults = {
  companyTaxCode: string;
  password: string;
  userId: string;
};

const DEV_LOGIN_DEFAULTS: DevLoginDefaults = {
  userId: "admin",
  password: "amnote123",
  companyTaxCode: "",
};

export function getDevLoginDefaults(): DevLoginDefaults | null {
  if (!import.meta.env.DEV) {
    return null;
  }

  return DEV_LOGIN_DEFAULTS;
}
