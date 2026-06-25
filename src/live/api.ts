export type ApiError = { error: string; details?: string };

export function getToken() {
  return localStorage.getItem("ss_token") || "";
}

export async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(path, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const data = (await res.json()) as ApiError;
      msg = data.error || msg;
    } catch {
      
    }
    throw new Error(msg);
  }

  return (await res.json()) as T;
}

