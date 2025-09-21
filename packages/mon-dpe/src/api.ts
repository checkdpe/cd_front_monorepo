type Primitive = string | number | boolean | null | undefined;

export function buildMapEndpointUrl(): string {
  const root = (import.meta as any).env?.VITE_ROOT_PATH || (globalThis as any).VITE_ROOT_PATH || (typeof process !== "undefined" ? (process as any).env?.VITE_ROOT_PATH : undefined);
  const sub = (import.meta as any).env?.VITE_MAP_SUB_PATH || (globalThis as any).VITE_MAP_SUB_PATH || (typeof process !== "undefined" ? (process as any).env?.VITE_MAP_SUB_PATH : undefined);

  if (!root) {
    throw new Error("VITE_ROOT_PATH is not defined");
  }
  if (!sub) {
    throw new Error("VITE_MAP_SUB_PATH is not defined");
  }

  const normalizedRoot = String(root).replace(/\/$/, "");
  const normalizedSub = String(sub).replace(/^\//, "");
  return `${normalizedRoot}/${normalizedSub}`;
}

export function toQueryString(params: Record<string, Primitive | Primitive[] | Record<string, Primitive> | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach(v => {
        if (v === undefined || v === null) return;
        searchParams.append(key, String(v));
      });
      return;
    }

    if (typeof value === "object") {
      Object.entries(value as Record<string, Primitive>).forEach(([nestedKey, nestedValue]) => {
        if (nestedValue === undefined || nestedValue === null) return;
        searchParams.append(`${key}[${nestedKey}]`, String(nestedValue));
      });
      return;
    }

    searchParams.set(key, String(value));
  });

  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchMapData<T = any>(params: Record<string, Primitive | Primitive[] | Record<string, Primitive> | undefined>): Promise<T> {
  const baseUrl = buildMapEndpointUrl();
  const url = `${baseUrl}${toQueryString(params)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch map data (${response.status}): ${text}`);
  }
  return response.json();
}


