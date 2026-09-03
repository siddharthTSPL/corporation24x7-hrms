import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong';
    if (error.response?.status === 401) {
      return Promise.reject(null);
    }
    const wrapped = new Error(message);
    // Preserve the raw response body (e.g. { errors: [...] } from bulk
    // onboarding row validation) so callers can access more than just
    // the top-level message when they need to.
    wrapped.responseData = error.response?.data;
    return Promise.reject(wrapped);
  }
);

export const registerAdmin = async (data) => {
  const res = await api.post('admin/register', data);
  return res.data;
};

export const verifyAdmin = async (token) => {
  const res = await api.get(`admin/verify/${token}`);
  return res.data;
};

export const loginAdmin = async (data) => {
  const res = await api.post('admin/login', data);
  return res.data;
};

export const logoutAdmin = async () => {
  const res = await api.post('admin/logout');
  return res.data;
};

export const getMeAdmin = async () => {
  const res = await api.get('admin/getme');
  return res.data;
};

export const sendForgetPasswordOtp = async (email) => {
  const res = await api.post('admin/forgetpassword', { email });
  return res.data;
};

export const verifyAdminOtp = async (data) => {
  const res = await api.post('admin/verifyotp', data);
  return res.data;
};

export const resetAdminPassword = async (data) => {
  const res = await api.post('admin/resetpassword', data);
  return res.data;
};

export const addManager = async (data) => {
  const res = await api.post('admin/addmanager', data);
  return res.data;
};

export const addEmployee = async (data) => {
  const res = await api.post('admin/addemployee', data);
  return res.data;
};

// Triggers a browser download of the bulk-onboarding .xlsx template.
export const downloadBulkEmployeeTemplate = async () => {
  const res = await api.get('admin/employees/bulk-template', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'bulk_employee_onboarding_template.xlsx');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// `file` is a raw File object from an <input type="file">.
export const bulkUploadEmployees = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await api.post('admin/employees/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  } catch (err) {
    // 400s (row-level validation errors) still carry a body with an
    // `errors` array - surface that instead of just throwing, so the UI
    // can render a per-row error table.
    if (err?.responseData) return err.responseData;
    throw err;
  }
};

export const bulkImportEmployeesFromSheet = async (sheetUrl) => {
  try {
    const res = await api.post('admin/employees/bulk-import-sheet', { sheetUrl });
    return res.data;
  } catch (err) {
    if (err?.responseData) return err.responseData;
    throw err;
  }
};

export const findAllManagers = async () => {
  const res = await api.get('admin/findallmanagers');
  return res.data;
};

export const findAllEmployeesFull = async () => {
  const res = await api.get('admin/findallemployeesfull');
  return res.data;
};

export const findAllManagerswithoutAdmin = async () => {
  const res = await api.get('admin/all-no-admin');
  return res.data;
}

export const editAdminProfile = async (data) => {
  const res = await api.put('admin/editadminprofile', data);
  return res.data;
};

export const changeAdminPassword = async (data) => {
  const res = await api.put('admin/changepassword', data);
  return res.data;
};