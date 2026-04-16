import axios from "axios";
import API_BASE_URL from "../config/apiConfig";
import { logout, refreshToken } from "@/lib/login";

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.withCredentials = true;

let refreshPromise: Promise<boolean> | null = null;

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const requestUrl = String(originalRequest.url ?? "");
    const isAuthEndpoint =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/auth/session") ||
      requestUrl.includes("/auth/logout");

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshToken().finally(() => {
          refreshPromise = null;
        });
      }

      const refreshed = await refreshPromise;
      if (refreshed) {
        return axios(originalRequest);
      }

      await logout();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);

export default axios;
