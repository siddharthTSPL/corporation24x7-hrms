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

export const getOfferMeta = async () => {
  const res = await api.get("recruitment/admin/offer/meta");
  return res.data;
};

export const previewCtc = async (data) => {
  const res = await api.post("recruitment/admin/offer/ctc-preview", data);
  return res.data;
};

export const generateOffer = async (candidateId, data) => {
  const res = await api.post(`recruitment/admin/offer/generate/${candidateId}`, data);
  return res.data;
};

export const getCandidateOfferBundle = async (candidateId) => {
  const res = await api.get(`recruitment/admin/offer/candidate/${candidateId}`);
  return res.data;
};

export const updateOffer = async (id, data) => {
  const res = await api.patch(`recruitment/admin/offer/${id}`, data);
  return res.data;
};

export const uploadOfferAssets = async (id, formData) => {
  const res = await api.post(`recruitment/admin/offer/${id}/assets`, formData);
  return res.data;
};

export const markOfferReviewDone = async (id) => {
  const res = await api.patch(`recruitment/admin/offer/${id}/review-done`);
  return res.data;
};

export const finalizeOffer = async (id) => {
  const res = await api.patch(`recruitment/admin/offer/${id}/finalize`);
  return res.data;
};

export const reopenOffer = async (id) => {
  const res = await api.patch(`recruitment/admin/offer/${id}/reopen`);
  return res.data;
};

export const fetchOfferPdf = async (id) => {
  const res = await api.get(`recruitment/admin/offer/${id}/download`, { responseType: "blob" });
  return res.data;
};

export const sendOfferEmail = async (id) => {
  const res = await api.post(`recruitment/admin/offer/${id}/send-email`);
  return res.data;
};

export const sendOfferWhatsapp = async (id) => {
  const res = await api.post(`recruitment/admin/offer/${id}/send-whatsapp`);
  return res.data;
};

export const resendOffer = async (id, data = {}) => {
  const res = await api.post(`recruitment/admin/offer/${id}/resend`, data);
  return res.data;
};

export const extendOfferValidity = async (id, data) => {
  const res = await api.patch(`recruitment/admin/offer/${id}/extend-validity`, data);
  return res.data;
};

export const joinCandidate = async (id, data = {}) => {
  const res = await api.patch(`recruitment/admin/candidate/join/${id}`, data);
  return res.data;
};

export const generateAppointment = async (candidateId) => {
  const res = await api.post(`recruitment/admin/appointment/${candidateId}/generate`);
  return res.data;
};

export const updateAppointment = async (id, data) => {
  const res = await api.patch(`recruitment/admin/appointment/${id}`, data);
  return res.data;
};

export const uploadAppointmentAssets = async (id, formData) => {
  const res = await api.post(`recruitment/admin/appointment/${id}/assets`, formData);
  return res.data;
};

export const finalizeAppointment = async (id) => {
  const res = await api.patch(`recruitment/admin/appointment/${id}/finalize`);
  return res.data;
};

export const fetchAppointmentPdf = async (id) => {
  const res = await api.get(`recruitment/admin/appointment/${id}/download`, { responseType: "blob" });
  return res.data;
};

export const sendAppointmentEmail = async (id) => {
  const res = await api.post(`recruitment/admin/appointment/${id}/send-email`);
  return res.data;
};

export const sendAppointmentWhatsapp = async (id) => {
  const res = await api.post(`recruitment/admin/appointment/${id}/send-whatsapp`);
  return res.data;
};

export const resendInterviewInvite = async (candidateId, roundId) => {
  const res = await api.post(`recruitment/admin/candidate/${candidateId}/round/${roundId}/resend-invite`);
  return res.data;
};

export const getInterviewers = async () => {
  const res = await api.get("recruitment/admin/interviewers");
  return res.data;
};

// ---- Offer / appointment approval (creator side) ----
export const getApprovers = async () => {
  const res = await api.get("recruitment/admin/approvers");
  return res.data;
};

export const submitForApproval = async ({ kind, id, approver_id, approver_model }) => {
  const res = await api.patch(`recruitment/admin/approval/${kind}/${id}/submit`, { approver_id, approver_model });
  return res.data;
};

export const withdrawApproval = async ({ kind, id }) => {
  const res = await api.patch(`recruitment/admin/approval/${kind}/${id}/withdraw`);
  return res.data;
};

// ---- Approver side (Admin or SuperAdmin) ----
export const getMyApprovals = async () => {
  const res = await api.get("recruitment/approvals/mine");
  return res.data;
};

export const getApprovalPendingCount = async () => {
  const res = await api.get("recruitment/approvals/pending-count");
  return res.data;
};

export const fetchApprovalPreview = async ({ kind, id }) => {
  const res = await api.get(`recruitment/approvals/${kind}/${id}/preview`, { responseType: "blob" });
  return res.data;
};

export const approveLetter = async ({ kind, id, signatureFile, reuseSignatureUrl }) => {
  const fd = new FormData();
  if (signatureFile) fd.append("signature", signatureFile);
  if (reuseSignatureUrl) fd.append("reuse_signature_url", reuseSignatureUrl);
  const res = await api.patch(`recruitment/approvals/${kind}/${id}/approve`, fd);
  return res.data;
};

export const rejectLetter = async ({ kind, id, reason }) => {
  const res = await api.patch(`recruitment/approvals/${kind}/${id}/reject`, { reason });
  return res.data;
};