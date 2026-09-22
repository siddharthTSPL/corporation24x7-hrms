import axios from "axios";

// Matches every other API module in this app (notification.api.js,
// singleSignIn.api.js, etc.): the backend mounts all routers directly
// off root ("app.use('/field-operations', fieldOperationsRouter)" in
// app.js), not under "/api". No "/api" suffix here.
//
// .env currently sets VITE_API_BASE_URL=http://localhost:5000/api/ (a
// leftover from an assumed IIS rewrite that doesn't exist in this
// backend). Rather than depend on that var being fixed everywhere it's
// used, strip a trailing "/api" here too, so this file is correct
// regardless of what VITE_API_BASE_URL / VITE_API_URL are set to.
const resolveApiBaseUrl = () => {
  const configured =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/";
  return String(configured)
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api$/, "");
};

const api = axios.create({
  baseURL: `${resolveApiBaseUrl()}/`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const match = config.url?.match(/duty\/([^/]+)/);
  const sessionId = match?.[1] ||
    (config.url?.includes("field-operations/visits/")
      ? localStorage.getItem("activeFieldSessionId")
      : null);
  if (sessionId && sessionId !== "take-over") {
    const token = localStorage.getItem(`deviceToken_${sessionId}`);
    if (token) {
      config.headers = config.headers || {};
      config.headers["X-Device-Token"] = token;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.data?.code === "DUTY_SESSION_ON_ANOTHER_DEVICE") {
      window.dispatchEvent(new CustomEvent("field-duty-device-conflict"));
    }
    return Promise.reject(error);
  },
);

export const getMyFieldDuty = () =>
  api.get("field-operations/my-duty").then((r) => r.data);
export const getFieldOverview = (filters = {}) => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== "" && v != null),
  );
  return api.get("field-operations/overview", { params }).then((r) => r.data);
};
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
export const takeOverDuty = (body) =>
  api.post("field-operations/duty/take-over", body).then((r) => r.data);
export const startFieldVisit = (sessionId, body) =>
  api
    .post(`field-operations/duty/${sessionId}/visits`, body)
    .then((r) => r.data);
export const endFieldVisit = (visitId, body) =>
  api.patch(`field-operations/visits/${visitId}/end`, body).then((r) => r.data);
export const getFieldTeams = () =>
  api.get("field-operations/teams").then((r) => r.data);
export const getFieldTeamOptions = (excludeTeamId) =>
  api
    .get("field-operations/team-options", {
      params: excludeTeamId ? { excludeTeamId } : {},
    })
    .then((r) => r.data);

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

export const exportFieldActivitiesCsvUrl = (filters = {}) => {
  const params = new URLSearchParams(
    Object.entries(filters)
      .filter(([, value]) => value !== "" && value != null)
      .map(([key, value]) => [key === "date" ? "from" : key, value]),
  );
  if (filters.date) params.set("to", filters.date);
  return `${resolveApiBaseUrl()}/field-operations/export/csv${params.size ? `?${params}` : ""}`;
};
export const exportMyVisitsCsvUrl = (filters = {}) => {
  const params = new URLSearchParams(
    Object.entries(filters)
      .filter(([, value]) => value !== "" && value != null)
      .map(([key, value]) => {
        if (key === "from") return ["from", value];
        if (key === "to") return ["to", value];
        if (key === "type") return ["activityType", value];
        return [key, value];
      }),
  );
  return `${resolveApiBaseUrl()}/field-operations/visits/export/csv${params.size ? `?${params}` : ""}`;
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
  api
    .delete(`field-operations/assignments/${assignmentId}`)
    .then((r) => r.data);

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
  return api
    .get("field-operations/visits/mine", { params })
    .then((r) => r.data);
};
export const getFieldAuditLog = ({ page = 1, limit = 50, action } = {}) =>
  api
    .get("field-operations/audit-log", { params: { page, limit, action } })
    .then((r) => r.data);

export const getAllFieldVisits = (filters = {}) => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== "" && value != null),
  );
  return api
    .get("field-operations/visits/all", { params })
    .then((response) => response.data);
};

export const fieldOperationsApi = api;