import axios from "@/api/axiosClient"
import API_BASE_URL from "@/config/apiConfig"

const base = `${API_BASE_URL}/pit-withholding/xsl-templates`
function unwrap<T>(value: T | { Data: T }): T {
  return (value as { Data?: T }).Data ?? (value as T)
}

export type PitXslTemplate = {
  XSL_ID: number
  COMPANY_CD: string
  TEMPLATE_CD: string
  TEMPLATE_NM: string
  SERIES?: string | null
  FROM_DOC_NO?: number
  TO_DOC_NO?: number | null
  IS_DEFAULT: number
  IS_ACTIVE: number
  XSL_CONTENT?: string | null
  LOGO_PATH?: string | null
  BACKGROUND_PATH?: string | null
  NEN_PATH?: string | null
  HAS_XSL_CONTENT: number
  UPDATE_BY?: string
  UPDATE_AT?: string
}

export type PitXslTemplateSaveRequest = {
  TEMPLATE_CD?: string
  TEMPLATE_NM?: string
  SERIES?: string
  FROM_DOC_NO?: number
  TO_DOC_NO?: number | null
  IS_DEFAULT?: number
  IS_ACTIVE?: number
  XSL_CONTENT?: string | null
  LOGO_PATH?: string | null
  BACKGROUND_PATH?: string | null
  NEN_PATH?: string | null
}

export const pitXslApi = {
  list: async () => unwrap<PitXslTemplate[]>((await axios.get(base, { params: { templateCd: "03/TNCN" } })).data),
  get: async (xslId: number) => unwrap<PitXslTemplate>((await axios.get(`${base}/${xslId}`)).data),
  create: async (body: PitXslTemplateSaveRequest) => unwrap<PitXslTemplate>((await axios.post(base, body)).data),
  update: async (xslId: number, body: PitXslTemplateSaveRequest) =>
    unwrap<PitXslTemplate>((await axios.put(`${base}/${xslId}`, body)).data),
  remove: async (xslId: number) => axios.delete(`${base}/${xslId}`),
  uploadImage: async (xslId: number, imageKind: "logo" | "background" | "nen", file: File) => {
    const form = new FormData()
    form.append("file", file)
    return unwrap<{ PATH: string; FILE_NAME: string; IMAGE_KIND: string; XSL_ID: number }>(
      (await axios.post(`${base}/${xslId}/images/${imageKind}`, form)).data,
    )
  },
  selectImage: async (
    xslId: number,
    imageKind: "logo" | "background" | "nen",
    fileName: string,
    path?: string,
  ) =>
    unwrap<{ PATH: string; FILE_NAME: string; IMAGE_KIND: string; XSL_ID: number }>(
      (await axios.put(`${base}/${xslId}/images/${imageKind}`, { FILE_NAME: fileName, PATH: path || undefined })).data,
    ),
  previewHtml: async (xslId: number) =>
    (await axios.get<string>(`${base}/${xslId}/preview/html`, { responseType: "text" })).data,
  previewPdf: async (xslId: number) =>
    (await axios.get<Blob>(`${base}/${xslId}/preview/pdf`, { responseType: "blob" })).data,
}
