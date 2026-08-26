import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || "Something went wrong";
    if (error.response?.status === 401) {
      return Promise.reject(null);
    }
    return Promise.reject(new Error(message));
  }
);

export const uploadDocument = async (data) => {
  const res = await api.post("user/upload", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const getDocuments = async () => {
  const res = await api.get("user/documents");
  return res.data;
};

export const editDocument = async ({ id, data }) => {
  const res = await api.put(`user/documents/${id}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const deleteDocument = async (id) => {
  const res = await api.delete(`user/documents/${id}`);
  return res.data;
};

export const fetchOrgInfo = async () => {
  const res = await api.get("user/getOrgInfo");
  return res.data;
};

export const getExpenseDocuments = async () => {
  const res = await api.get("user/getExpenseDocuments");
  return res.data;
};

export const getPersonalDocuments = async () => {
  const res = await api.get("user/getPersonalDocuments");
  return res.data;
};

export const respondToMyReviewAsEmployee = async (data) => {
  const res = await api.post("user/review/respond", data);
  return res.data;
};