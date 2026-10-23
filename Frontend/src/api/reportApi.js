const API = import.meta.env.VITE_API_URL || ""; // use the same base as your other API calls
const BASE = `${API}/admin/reports`;

const headers = { "Content-Type": "application/json" };

export async function fetchReportList() {
  const res = await fetch(BASE, { headers, credentials: "include" });
  const body = await res.json();
  if (!res.ok)
    throw new Error(body.message || body.error || "Failed to load reports");
  return body.data;
}

export async function runReport(key, filters) {
  const res = await fetch(`${BASE}/${key}`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(filters),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || body.error || "Report failed");
  return body.data;
}

export async function downloadReport(key, filters, format) {
  const res = await fetch(`${BASE}/${key}?format=${format}`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(filters),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || "Download failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${key}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
