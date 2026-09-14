import axios from "axios";

<<<<<<< HEAD
const resolveApiBaseUrl = () => {
  const configured =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000";
  const trimmed = String(configured).trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed.slice(0, -"/api".length) : trimmed;
};

const api = axios.create({
  baseURL: `${resolveApiBaseUrl()}/`,
=======
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
  withCredentials: true,
});

export const getMyFieldDuty = () =>
  api.get("field-operations/my-duty").then((r) => r.data);
<<<<<<< HEAD
export const getFieldOverview = (filters = {}) => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== "" && v != null),
  );
  return api.get("field-operations/overview", { params }).then((r) => r.data);
};
=======
export const getFieldOverview = () =>
  api.get("field-operations/overview").then((r) => r.data);
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
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
<<<<<<< HEAD
export const getFieldTeamOptions = (excludeTeamId) =>
  api
    .get("field-operations/team-options", {
      params: excludeTeamId ? { excludeTeamId } : {},
    })
    .then((r) => r.data);

=======
export const getFieldTeamOptions = () =>
  api.get("field-operations/team-options").then((r) => r.data);
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
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

<<<<<<< HEAD
export const exportFieldActivitiesCsvUrl = (filters = {}) => {
  const params = new URLSearchParams(
    Object.entries(filters)
      .filter(([, value]) => value !== "" && value != null)
      .map(([key, value]) => [key === "date" ? "from" : key, value]),
  );
  if (filters.date) params.set("to", filters.date);
  return `${resolveApiBaseUrl()}/field-operations/export/csv${params.size ? `?${params}` : ""}`;
};

export const submitFieldCheckIn = (sessionId, body) =>
  api
    .post(`field-operations/duty/${sessionId}/check-in`, body)
    .then((r) => r.data);

export const downloadBulkAssignTemplateUrl = () =>
  `${resolveApiBaseUrl()}/field-operations/bulk-assign/template`;
export const uploadBulkAssignFile = (file, autoCreateTeams = false) => {
  const form = new FormData();
  form.append("file", file);
  form.append("autoCreateTeams", String(autoCreateTeams));
  return api
    .post(`field-operations/bulk-assign/upload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const updateFieldTeam = (teamId, body) =>
  api.patch(`field-operations/teams/${teamId}`, body).then((r) => r.data);
export const deleteFieldTeam = (teamId) =>
  api.delete(`field-operations/teams/${teamId}`).then((r) => r.data);

export const getFieldAssignments = () =>
  api.get("field-operations/assignments").then((r) => r.data);
export const createIndividualFieldAssignment = (body) =>
  api.post("field-operations/assignments", body).then((r) => r.data);
export const removeIndividualFieldAssignment = (assignmentId) =>
  api.delete(`field-operations/assignments/${assignmentId}`).then((r) => r.data);

export const getMyAssignedActivities = () =>
  api.get("field-operations/activities/mine").then((r) => r.data);
export const assignFieldActivity = (body) =>
  api.post("field-operations/activities", body).then((r) => r.data);
export const reassignFieldActivity = (activityId, body) =>
  api
    .patch(`field-operations/activities/${activityId}/reassign`, body)
    .then((r) => r.data);
export const cancelFieldActivity = (activityId, body = {}) =>
  api
    .patch(`field-operations/activities/${activityId}/cancel`, body)
    .then((r) => r.data);
export const getMyFieldVisits = (filters = {}) => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== "" && v != null),
  );
  return api.get("field-operations/visits/mine", { params }).then((r) => r.data);
};
export const getFieldAuditLog = ({ page = 1, limit = 50, action } = {}) =>
  api
    .get("field-operations/audit-log", { params: { page, limit, action } })
    .then((r) => r.data);

=======
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
export const fieldOperationsApi = api;
