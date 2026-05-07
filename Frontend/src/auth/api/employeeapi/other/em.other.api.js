import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/document",
  withCredentials: true,
});

export const uploadDocument = async (data) => {
  const res = await api.post("/upload", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const getDocuments = async () => {
  const res = await api.get("/");
  return res.data;
};

export const editDocument = async ({ id, ...data }) => {
  const res = await api.put(`/${id}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const deleteDocument = async (id) => {
  const res = await api.delete(`/${id}`);
  return res.data;
};

export const getattendance = async () => {
  const res = await api.get("/getattendance");
  return res.data;
};