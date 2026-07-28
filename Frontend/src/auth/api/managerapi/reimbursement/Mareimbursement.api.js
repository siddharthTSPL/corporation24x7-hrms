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

export const applyReimbursement = async (data) => {
  const res = await api.post("reimbursement/manager/apply", data);
  return res.data;
};

export const updateReimbursement = async (id, data) => {
  const res = await api.put(`reimbursement/manager/update/${id}`, data);
  return res.data;
};

export const deleteReimbursement = async (id) => {
  const res = await api.delete(`reimbursement/manager/delete/${id}`);
  return res.data;
};

export const getMyReimbursements = async () => {
  const res = await api.get("reimbursement/manager/my");
  return res.data;
};