const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? "https://dd4wkfj3fol31.cloudfront.net";

function getToken(): string | null {
  return localStorage.getItem("token");
}

function setToken(token: string): void {
  localStorage.setItem("token", token);
}

function clearToken(): void {
  localStorage.removeItem("token");
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const incomingHeaders = (options.headers ?? {}) as Record<string, string>;

  const isFormData = options.body instanceof FormData;
  const isUrlEncoded = incomingHeaders["Content-Type"] === "application/x-www-form-urlencoded";

  const headers: Record<string, string> = { ...incomingHeaders };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (!isFormData && !isUrlEncoded) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    if (res.status === 401) clearToken();
    const detail = data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
        ? detail.map((d: any) => d.msg ?? d).join(", ")
        : `Request failed: ${res.status}`;
    const err = Object.assign(new Error(message), { status: res.status });
    throw err;
  }

  return data;
}

const api = {
  get: (path: string) => apiFetch(path, { method: "GET" }),

  post: (path: string, body?: any) =>
    apiFetch(path, {
      method: "POST",
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: (path: string, body?: any) =>
    apiFetch(path, {
      method: "PATCH",
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: (path: string) => apiFetch(path, { method: "DELETE" }),

  postForm: (path: string, data: Record<string, string>) =>
    apiFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(data).toString(),
    }),

  getToken,
  setToken,
  clearToken,
};

export default api;
