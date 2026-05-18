import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});


export const createAnnouncement = async (data) => {
  const res = await api.post("superadmin/createannouncement", data);
  return res.data;
};

export const getAllAnnouncements = async () => {
  const res = await api.get("superadmin/getallannouncement");
  return res.data;
};

export const updateAnnouncement = async (id, data) => {
  const res = await api.put(
    `superadmin/updateannouncement/${id}`,
    data
  );
  return res.data;
};

export const deleteAnnouncement = async (id) => {
  const res = await api.delete(
    `superadmin/deleteannouncement/${id}`
  );
  return res.data;
};

