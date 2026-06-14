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
export const uploadManagerDocument = async (data) => {
  const res = await api.post("manager/upload", data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

// Get Manager Documents
export const getManagerDocuments = async () => {
  const res = await api.get("manager/documents");
  return res.data;
};

// Update Document
export const updateManagerDocument = async ({ id, data }) => {
  const res = await api.put(`manager/documents/${id}`, data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

// Delete Document
export const deleteManagerDocument = async (id) => {
  const res = await api.delete(`manager/documents/${id}`);
  return res.data;
};

// Get All Expense Documents
export const getAllExpenseDocuments = async () => {
  const res = await api.get("manager/getAllExpenseDocuments");
  return res.data;
};

// Get All Personal Documents
export const getAllPersonalDocuments = async () => {
  const res = await api.get("manager/getAllPersonalDocuments");
  return res.data;
};

// Get Document Details
export const getDocumentDetails = async (documentId) => {
  const res = await api.get(
    `manager/getDocumentDetails/${documentId}`
  );

  return res.data;
};