import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong';
    if (error.response?.status === 401) return Promise.reject(null);
    return Promise.reject(new Error(message));
  }
);

export const fetchSelfServiceSummary = async () => {
  const res = await api.get('self-service/summary');
  return res.data;
};