import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

export const getMyFieldDuty = () =>
  api.get("field-operations/my-duty").then((r) => r.data);
export const getFieldOverview = () =>
  api.get("field-operations/overview").then((r) => r.data);
export const startFieldDuty = (body) =>
  api.post("field-operations/duty/start", body).then((r) => r.data);
export const updateFieldDutyStatus = (sessionId, status) =>
  api
    .patch(`field-operations/duty/${sessionId}/status`, { status })
    .then((r) => r.data);
export const sendFieldLocation = (sessionId, body) =>
  api
    .post(`field-operations/duty/${sessionId}/locations`, body)
    .then((r) => r.data);
export const checkoutFieldDuty = (sessionId, body = {}) =>
  api
    .post(`field-operations/duty/${sessionId}/checkout`, body)
    .then((r) => r.data);
export const startFieldVisit = (sessionId, body) =>
  api
    .post(`field-operations/duty/${sessionId}/visits`, body)
    .then((r) => r.data);
export const endFieldVisit = (visitId, body) =>
  api.patch(`field-operations/visits/${visitId}/end`, body).then((r) => r.data);
export const getFieldTeams = () =>
  api.get("field-operations/teams").then((r) => r.data);
export const getFieldTeamOptions = () =>
  api.get("field-operations/team-options").then((r) => r.data);
export const createFieldTeam = (body) =>
  api.post("field-operations/teams", body).then((r) => r.data);
export const getFieldSettings = () =>
  api.get("field-operations/settings").then((r) => r.data);
export const updateFieldSettings = (body) =>
  api.patch("field-operations/settings", body).then((r) => r.data);
export const getFieldRoute = (employeeId, date) =>
  api
    .get(`field-operations/employees/${employeeId}/route`, {
      params: date ? { date } : {},
    })
    .then((r) => r.data);
export const uploadVisitPhoto = (visitId, file) => {
  const form = new FormData();
  form.append("photo", file);
  return api
    .post(`field-operations/visits/${visitId}/photo`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const fieldOperationsApi = api;
