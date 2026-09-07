/**
 * VetCheck API Configuration & Client Helper
 * 
 * In development: Uses local Express server (defaults to relative path /api/*)
 * In production: Configurable via VITE_API_BASE_URL (e.g. https://vetcheck-api.onrender.com)
 */

export function getApiBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim() !== "") {
    return envUrl.trim().replace(/\/+$/, "");
  }
  return "";
}

/**
 * Constructs a fully qualified or relative API URL
 * @param path - API path, e.g. "/api/analyze" or "/api/health"
 */
export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

/**
 * Standard fetch wrapper that automatically routes through the configured API Base URL
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = apiUrl(path);
  return fetch(url, init);
}
