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
  },
);

export const getAllRequisitions = async () => {
  const res = await api.get("recruitment/admin/all");
  return res.data;
};

export const getPendingRequisitions = async () => {
  const res = await api.get("recruitment/admin/pending");
  return res.data;
};

export const getRequisitionById = async (id) => {
  const res = await api.get(`recruitment/admin/detail/${id}`);
  return res.data;
};

export const approveRequisition = async (id, data = {}) => {
  const res = await api.patch(`recruitment/admin/approve/${id}`, data);
  return res.data;
};

export const rejectRequisition = async (id, data) => {
  const res = await api.patch(`recruitment/admin/reject/${id}`, data);
  return res.data;
};

export const holdRequisition = async (id, data = {}) => {
  const res = await api.patch(`recruitment/admin/hold/${id}`, data);
  return res.data;
};

export const requestRevision = async (id, data) => {
  const res = await api.patch(`recruitment/admin/revision/${id}`, data);
  return res.data;
};

export const addCandidate = async (data) => {
  const res = await api.post("recruitment/admin/candidate/add", data);
  return res.data;
};

export const getCandidatesByRequisition = async (requisition_id) => {
  const res = await api.get(
    `recruitment/admin/candidate/list/${requisition_id}`,
  );
  return res.data;
};

export const getCandidateById = async (id) => {
  const res = await api.get(`recruitment/admin/candidate/detail/${id}`);
  return res.data;
};

export const updateCandidateStage = async (id, data) => {
  const res = await api.patch(`recruitment/admin/candidate/stage/${id}`, data);
  return res.data;
};

export const scheduleInterview = async (id, data) => {
  const res = await api.post(
    `recruitment/admin/candidate/schedule/${id}`,
    data,
  );
  return res.data;
};

export const submitInterviewFeedback = async (candidateId, roundId, data) => {
  const res = await api.patch(
    `recruitment/admin/candidate/feedback/${candidateId}/${roundId}`,
    data,
  );

  return res.data;
};
