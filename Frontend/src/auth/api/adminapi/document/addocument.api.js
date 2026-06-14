import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || "Something went wrong";

    if (error.response?.status === 401) {
      return Promise.reject(null);
    }

    return Promise.reject(new Error(message));
  }
);

// Upload Document
export const uploadDocument = async (data) => {
  const res = await api.post("admin/upload", data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

// Get My Documents
export const getDocuments = async () => {
  const res = await api.get("admin/documents");
  return res.data;
};

// Update Document
export const updateDocument = async ({ id, data }) => {
  const res = await api.put(`admin/documents/${id}`, data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

// Delete Document
export const deleteDocument = async (id) => {
  const res = await api.delete(`admin/documents/${id}`);
  return res.data;
};

// Get All Personal Documents (Admin)
export const getAllPersonalDocuments = async () => {
  const res = await api.get("admin/documents/personal");
  return res.data;
};

// Get All Expense Documents (Admin)
export const getAllExpenseDocuments = async () => {
  const res = await api.get("admin/documents/expense");
  return res.data;
};

// Get Document Details
export const getDocumentDetails = async (documentId) => {
  const res = await api.get(`admin/documents/${documentId}`);
  return res.data;
};