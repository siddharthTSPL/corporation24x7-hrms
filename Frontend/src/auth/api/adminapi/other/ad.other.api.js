import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/admin',
  withCredentials: true,
});



export const getAllEmployee = async () => {
  const res = await api.get("/getallemployee");
  return res.data;
};

export const getParticularEmployee = async (uid) => {
  const res = await api.get(`/getperticularemployee/${uid}`);
  return res.data;
};

export const deleteUser = async (uid) => {
  const res = await api.delete(`/deleteuser/${uid}`);
  return res.data;
};


export const getEmployeeStats = async () => {
  const res = await api.get("/noofemployee");
  return res.data;
};



export const reviewToManager = async (data) => {
  const res = await api.post("/reviewtomanager", data);
  return res.data;
};

