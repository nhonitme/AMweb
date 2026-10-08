export interface AcclistInfo {
  COMPANY_CD: string;
  ACC_ID: number;
  ACC_CD: string;
  ACC_PARENT_ID: number;

  ACCTITLE_NM_VIET: string;
  ACCTITLE_NM_ENG: string;
  ACCTITLE_NM_KOR: string;
  ACCTITLE_NM_JAPAN: string;
  ACCTITLE_NM_CHINA: string;

  ISCUSTOMER: string;
  ISABLETYPE: number;
  ISABLEINPUT: string;
  ISUSERADD: string;

  LEVEL: number;
  DECISION: string;
  DESTINATION_ACC_CD: string;

  ISDEL: string;
}