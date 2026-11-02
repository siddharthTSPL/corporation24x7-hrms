import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const e = new Error(error.response?.data?.message || "Something went wrong");
    e.status = error.response?.status;
    return Promise.reject(e);
  },
);

export const getMessageReceipts = async (messageId) => (await api.get(`chat/messages/${messageId}/receipts`)).data;

export const getConversationReceipts = async ({ id, messageIds }) => (await api.post(`chat/conversations/${id}/receipts`, { messageIds })).data;
