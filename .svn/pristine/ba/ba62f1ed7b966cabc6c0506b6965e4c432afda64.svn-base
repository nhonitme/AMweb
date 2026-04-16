export interface CompanyInfo {
  companyName: string;
  address: string;
  taxCode: string;
  province: string;
  taxOfficeCode: string;
  companyType: string;
  accountingCompany: string;
  accountingPeriod: string;
  phone?: string;
  email?: string;
  directorName?: string;
  businessRegistrationNumber?: string;
  businessForm?: string;
  businessType?: string;
  fax?: string;
  operationStartDate?: string;
  positionVietnamese?: string;
  positionEnglish?: string;
  positionKorean?: string;
  positionChinese?: string;
}

export interface AccountingSettings {
  cDecision: string; // 'c200' | 'c133'
  pricingMethod: string;
  taxMethod: string;
  closingMethod: string;
  allowNegativeInventory: boolean;
  decimalPlaces: number;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  branch: string;
}

export interface FirmbankingSettings {
  bankAccounts: BankAccount[];
  otpEmail: string;
  otpPhone: string;
  securityQuestions: SecurityQuestion[];
}

export interface SecurityQuestion {
  id: string;
  question: string;
  answer: string;
}

export interface SignatureSettings {
  hasSignature: boolean;
  signatureFile?: File;
  signaturePreview?: string;
}

export interface InvoiceSettings {
  apiEndpoint: string;
  apiToken: string;
  invoiceTemplate: string;
  invoiceSymbol: string;
  serialNumber: string;
  issuancePolicy: string;
}

export interface FormErrors {
  [key: string]: string;
}

export type ActiveTab = 'company-info' | 'accounting' | 'firmbanking' | 'signature' | 'invoice';