import { fetchAuthSession } from "aws-amplify/auth";

export async function getAccessToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    const token = session?.tokens?.accessToken?.toString();
    return token ?? null;
  } catch {
    return null;
  }
}

export async function authorizedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init?.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}


