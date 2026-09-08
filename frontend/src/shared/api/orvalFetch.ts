import { ApiError } from "./ApiError";

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205 || !response.body) return undefined;

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("application/json") || contentType.includes("+json")) {
    const text = await response.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }
  if (contentType.startsWith("text/")) return response.text();
  return response.blob();
}

/** Transport unique utilisé par toutes les fonctions générées par Orval. */
export async function orvalFetch<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const data = await parseResponse(response);
  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      statusText: response.statusText,
      data,
    });
  }
  return data as T;
}