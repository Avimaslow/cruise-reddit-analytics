const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export async function apiGet(path) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} for ${url}\n${text}`);
  }
  return res.json();
}
