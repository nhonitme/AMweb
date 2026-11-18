import axios from "@/api/axiosClient"
import API_BASE_URL from "@/config/apiConfig"
import { normalizePagedResult } from "@/lib/paging"
import type { PagedResult } from "@/types/paging"
import type { EInvoiceEmailHistory } from "@/types/einvoiceMailHistory"
import type { PitDocument, PitKind, PitSearchParams, PitTransmissionMessage } from "./types"

const base = `${API_BASE_URL}/pit-withholding`
function unwrap<T>(value: T | { Data: T }): T { return (value as { Data?: T }).Data ?? value as T }
export const pitApi = {
  list: async (kind: PitKind, fromYmd?: string, toYmd?: string, keyword?: string) =>
    unwrap<PitDocument[]>((await axios.get(`${base}/${kind}`,{params:{fromYmd:fromYmd||undefined,toYmd:toYmd||undefined,keyword}})).data),
  listPaged: async (kind: PitKind, params: PitSearchParams): Promise<PagedResult<PitDocument>> => {
    const response = (await axios.get(`${base}/${kind}`, { params })).data as Record<string, unknown>
    const data = unwrap<PitDocument[]>(response as unknown as PitDocument[] | { Data: PitDocument[] })
    return normalizePagedResult(response, Array.isArray(data) ? data : [], params.pageNumber, params.pageSize)
  },
  get: async (kind: PitKind,id: number) => unwrap<PitDocument>((await axios.get(`${base}/${kind}/${id}`)).data),
  save: async (data: PitDocument) => {
    const response = data.DOCUMENT_ID
      ? await axios.put(`${base}/${data.KIND}/${data.DOCUMENT_ID}`, data)
      : await axios.post(`${base}/${data.KIND}`, data)
    return unwrap<PitDocument>(response.data)
  },
  remove: async (kind: PitKind,row: PitDocument) => axios.delete(`${base}/${kind}/${row.DOCUMENT_ID}`,{params:{version:row.DOC_VERSION}}),
  prepare: async (kind: PitKind,id: number) => unwrap<{DOC_VERSION:number;RAW_XML:string;SIGN_TYPE:"PIT"}>((await axios.post(`${base}/${kind}/${id}/signing-payload`)).data),
  sign: async (kind: PitKind,id: number,version: number,xml: string) => unwrap<PitDocument>((await axios.post(`${base}/${kind}/${id}/signature`,{DOC_VERSION:version,XML:xml})).data),
  xml: async (kind: PitKind,id: number) => (await axios.get<string>(`${base}/${kind}/${id}/xml`,{responseType:"text"})).data,
  printPdf: async (kind: PitKind,id: number) => (await axios.get<Blob>(`${base}/${kind}/${id}/print/pdf`,{responseType:"blob"})).data,
  history: async (kind: PitKind,id: number) => unwrap<PitTransmissionMessage[]>((await axios.get(`${base}/${kind}/${id}/history`)).data),
  mailHistory: async (kind: PitKind, id: number) => unwrap<EInvoiceEmailHistory[]>((await axios.get(`${base}/${kind}/${id}/mail-history`)).data),
  sendMail: async (kind: PitKind, id: number, toEmail: string) => unwrap<{ Sent: boolean; HistorySaved: boolean; Warning?: string | null }>(
    (await axios.post(`${base}/${kind}/${id}/send-mail`, { toEmail })).data,
  ),
}
