export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  "https://vetcheck-jqe1.onrender.com";

export function getApiBaseUrl(): string {
  return API_BASE_URL.replace(/\/+$/, "");
}

export const apiUrl = (path: string) => {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init);
}