import axios from "@/api/axiosClient"

type ApiEnvelope<T> = {
  Data?: T
  data?: T
  Message?: string
  message?: string
  Success?: boolean
  success?: boolean
}

function normalizeDeleteResponse<T>(payload: ApiEnvelope<T> | T): { success: boolean; message?: string } {
  if (!payload || typeof payload !== "object") {
    return { success: true }
  }

  const envelope = payload as ApiEnvelope<T>
  return {
    success: envelope.Success ?? envelope.success ?? true,
    message: envelope.Message ?? envelope.message,
  }
}

export async function deleteMasterRecords(
  baseUrl: string,
  ids: number[],
  idsFieldName: string,
  route = "bulk-delete",
): Promise<{ success: boolean; message?: string }> {
  const normalizedIds = Array.from(
    new Set(ids.filter((id) => typeof id === "number" && Number.isFinite(id) && id > 0)),
  )

  if (normalizedIds.length === 0) {
    throw new Error("Ids are required")
  }

  const response = await axios.post<ApiEnvelope<{ deleted: number }>>(`${baseUrl}/${route}`, {
    [idsFieldName]: normalizedIds,
  })

  return normalizeDeleteResponse(response.data)
}
