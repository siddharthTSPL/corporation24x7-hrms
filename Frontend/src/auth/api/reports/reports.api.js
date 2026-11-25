import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Export responses are blobs - decode the JSON error the backend sent.
    let message = error.response?.data?.message;
    if (error.response?.data instanceof Blob) {
      try { message = JSON.parse(await error.response.data.text()).message; } catch { /* keep default */ }
    }
    if (error.response?.status === 401) return Promise.reject(null);
    const e = new Error(message || "Something went wrong");
    e.status = error.response?.status;
    return Promise.reject(e);
  },
);

export const getReportCatalog = async () => (await api.get("reports/catalog")).data;

export const getReportLookup = async (name, q = "") =>
  (await api.get(`reports/lookups/${name}`, { params: q ? { q } : {} })).data.data;

// POST (not GET) so payroll filters never appear in URLs or access logs.
export const runReport = async (key, body) => (await api.post(`reports/${key}/run`, body)).data;

// The server re-queries with the same filters; the client never sends rows.
export const exportReport = async (key, filters) => {
  const res = await api.post(`reports/${key}/export`, { filters }, { responseType: "blob" });
  const cd = res.headers["content-disposition"] || "";
  const name = /filename="?([^";]+)"?/.exec(cd)?.[1] || `${key}.xlsx`;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
