import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/admin",
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


export const createAnnouncement = async (data) => {
  const res = await api.post("/createannouncement", data);
  return res.data;
};

export const getAllAnnouncement = async () => {
  const res = await api.get("/getallannouncement");
  return res.data;
};

export const deleteAnnouncement = async (id) => {
  const res = await api.delete(`/deleteannouncement/${id}`);
  return res.data;
};

export const updateAnnouncement = async ({ id, data }) => {
  const res = await api.put(`/updateannouncement/${id}`, data);
  return res.data;
}