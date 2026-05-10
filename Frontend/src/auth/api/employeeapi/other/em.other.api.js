import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

export const uploadDocument = async (data) => {
  const res = await api.post("document/upload", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const getDocuments = async () => {
  const res = await api.get("document/");
  return res.data;
};

export const editDocument = async ({ id, ...data }) => {
  const res = await api.put(`document/${id}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const deleteDocument = async (id) => {
  const res = await api.delete(`document/${id}`);
  return res.data;
};

export const fetchOrgInfo = async () => {
  const res = await api.get("user/getorginfo");
  return res.data;
};

