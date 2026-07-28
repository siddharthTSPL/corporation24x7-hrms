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
//
// `files` (optional) — array of File objects from an <input type="file" multiple">,
// sent as multipart/form-data so the backend can attach them straight to the
// outgoing support email.
export const sendSupportRequest = async (role, { subject, message, page, files }) => {
  const prefix = ROLE_PREFIX[role] || 'user';

  const form = new FormData();
  form.append('subject', subject);
  form.append('message', message);
  if (page) form.append('page', page);
  (files || []).forEach((file) => form.append('attachments', file));

  const res = await api.post(`${prefix}/contact-support`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};