import axios from "@/api/axiosClient";

export async function apiGet<T>(url: string): Promise<T> {
  const response = await axios.get<T>(url);
  return response.data;
}

export async function apiPost<T>(url: string, data: unknown): Promise<T> {
  const response = await axios.post<T>(url, data);
  return response.data;
}

export async function apiPut<T>(url: string, data: unknown): Promise<T> {
  const response = await axios.put<T>(url, data);
  return response.data;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const response = await axios.delete<T>(url);
  return response.data;
}
