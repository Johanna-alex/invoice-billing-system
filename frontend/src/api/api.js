export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4500/api";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest(path, options = {}, token = null) {
  const headers = { ...(options.headers || {}) };

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError("Unable to reach the server. Check that the backend is running.", 0);
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(data?.message || `Request failed with status ${response.status}`, response.status);
  }

  return data;
}

export function buildQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  const text = query.toString();
  return text ? `?${text}` : "";
}

export async function fetchAllPages(apiFetch, path, key) {
  const first = await apiFetch(`${path}${buildQuery({ page: 1, limit: 100 })}`);
  const records = [...(first[key] || [])];
  const totalPages = first.pagination?.totalPages || 1;

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await apiFetch(`${path}${buildQuery({ page, limit: 100 })}`);
    records.push(...(next[key] || []));
  }

  return { records, total: first.pagination?.total ?? records.length };
}
