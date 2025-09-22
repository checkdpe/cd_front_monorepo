export type FetchSimulationFullParams = {
  baseUrl?: string;
  ref_ademe: string;
  accessToken: string; // Cognito JWT access token
};

export async function fetchSimulationDpeFull(params: FetchSimulationFullParams): Promise<Response> {
  const { baseUrl = "https://api-dev.etiquettedpe.fr", ref_ademe, accessToken } = params;
  const url = new URL("/backoffice/simulation_dpe_full", baseUrl);
  url.searchParams.set("ref_ademe", ref_ademe);

  const resp = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "User-Agent": "@acme/dpe-editor",
    },
  });

  return resp;
}

export async function fetchSimulationDpeFullJson<T = unknown>(params: FetchSimulationFullParams): Promise<T> {
  const resp = await fetchSimulationDpeFull(params);
  if (!resp.ok) {
    const text = await safeText(resp);
    throw new Error(`HTTP ${resp.status} ${resp.statusText} – ${text}`);
  }
  return resp.json() as Promise<T>;
}

async function safeText(resp: Response): Promise<string> {
  try {
    return await resp.text();
  } catch {
    return "";
  }
}


