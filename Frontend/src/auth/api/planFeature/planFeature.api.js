import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || "Something went wrong";
    if (error.response?.status === 401) return Promise.reject(null);
    return Promise.reject(new Error(message));
  },
);

// Default: locked. If the request fails for any reason we fail closed —
// better to show an upgrade screen than to flash a page whose API calls
// will just come back 403 anyway.
const LOCKED_FALLBACK = {
  plan: null,
  isTrialActive: false,
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
  features: {
    review: false,
    timesheet: false,
    recruitment: false,
    asset: false,
    tickets: false,
    fieldOperations: false,
  },
  fieldAssignment: { isMember: false, isManager: false },
<<<<<<< HEAD

=======
=======
  features: { review: false, timesheet: false, recruitment: false, asset: false, tickets: false, single_sign_in: false },
>>>>>>> origin/Ashish
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
};

export const fetchPlanFeatures = async () => {
  try {
    const res = await api.get("plan-features");
    return res.data ?? LOCKED_FALLBACK;
  } catch {
    return LOCKED_FALLBACK;
  }
};
