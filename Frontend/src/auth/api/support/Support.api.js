import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});

const ROLE_PREFIX = {
  superadmin: 'superadmin',
  admin: 'admin',
  manager: 'manager',
  employee: 'user',
};

// subject + message ke saath backend khud req.user se name/email/role/org
// nikaal leta hai — yaha sirf role ke hisaab se sahi prefix (/admin, /manager,
// /user, /superadmin) choose karna hai taaki sahi auth middleware hit ho.
export const sendSupportRequest = async (role, { subject, message, page }) => {
  const prefix = ROLE_PREFIX[role] || 'user';
  const res = await api.post(`${prefix}/contact-support`, { subject, message, page });
  return res.data;
};