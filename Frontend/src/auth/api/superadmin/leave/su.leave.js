import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});


export const showAllLeaves = async () => {
  const res = await api.get("superadmin/all-leaves");
  return res.data;
};

export const acceptLeaveByAdmin = async (id, leaveFor) => {
  const res = await api.put(
    `superadmin/accept-leave/${id}?leaveFor=${leaveFor}`
  );
  return res.data;
};

export const rejectLeaveByAdmin = async (id, leaveFor) => {
  const res = await api.put(
    `superadmin/reject-leave/${id}?leaveFor=${leaveFor}`
  );
  return res.data;
};