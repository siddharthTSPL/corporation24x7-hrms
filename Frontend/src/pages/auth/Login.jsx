import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAdminLogin,
  useGetMeAdmin,
} from "../../auth/server-state/adminauth/adminauth.hook";

export default function Login() {
  const navigate = useNavigate();
  const { data: admin } = useGetMeAdmin();
  const { mutate: loginAdminFn, isPending, error } = useAdminLogin();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    if (admin) {
      navigate("/dashboard", { replace: true });
    }
  }, [admin, navigate]);

  const validate = () => {
    let newErrors = {};

    if (!form.email) newErrors.email = "Email is required";
    if (!form.password) newErrors.password = "Password is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = () => {
    if (!validate()) return;

    loginAdminFn({
      identifier: form.email,
      password: form.password,
    });
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
          Welcome Back 👋
        </h2>

        <p className="text-center text-gray-500 mb-6">
          Login to your admin account
        </p>

        <div className="mb-4">
          <input
            type="text"
            name="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.email && (
            <p className="text-red-500 text-sm">{errors.email}</p>
          )}
        </div>

        <div className="mb-4">
          <input
            type="password"
            name="password"
            placeholder="Enter your password"
            value={form.password}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.password && (
            <p className="text-red-500 text-sm">{errors.password}</p>
          )}
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-3 text-center">
            {error.message}
          </p>
        )}

        <button
          onClick={handleLogin}
          disabled={isPending}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg"
        >
          {isPending ? "Logging in..." : "Login"}
        </button>

        <p className="text-sm text-center text-gray-500 mt-6">
          Secure HRMS Access 🔐
        </p>
      </div>
    </div>
  );
}