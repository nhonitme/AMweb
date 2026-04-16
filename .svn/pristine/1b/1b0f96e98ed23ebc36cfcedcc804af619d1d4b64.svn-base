import { logout, refreshToken } from "./login";

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });

  if (response.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      response = await fetch(url, {
        ...options,
        credentials: "include",
        headers,
      });
    } else {
      await logout();
      window.location.href = "/login";
      throw new Error("Session expired. Please login again.");
    }
  }

  return response;
}

export async function apiGet<T>(url: string): Promise<T> {
  const response = await fetchWithAuth(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

export async function apiPost<T>(url: string, data: unknown): Promise<T> {
  const response = await fetchWithAuth(url, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

export async function apiPut<T>(url: string, data: unknown): Promise<T> {
  const response = await fetchWithAuth(url, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

export async function apiDelete<T>(url: string): Promise<T> {
  const response = await fetchWithAuth(url, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}
