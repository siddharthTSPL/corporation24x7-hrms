import { useState, useEffect } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Player } from "@lottiefiles/react-lottie-player";
import { useLogin } from "../../auth/store/getmeauth/getmeauth";
import {
  useSendForgetPasswordOtp,
  useVerifyAdminOtp,
} from "../../auth/server-state/adminauth/adminauth.hook";
import {
  useForgotPasswordSuperAdmin,
  useVerifySuperAdminOtp,
} from "../../auth/server-state/superadmin/other/suother.hook";
import {
  useForgetPasswordManager,
  useVerifyManagerOtpApi,
} from "../../auth/server-state/manager/managgerother/managerother.hook";
import {
  useForgetPassword,
  useVerifyOtp,
} from "../../auth/server-state/employee/employeeauth/employeeauth.hook";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import slide1 from "../../assets/slide1.png";
import slide2 from "../../assets/slide2.png";
import slide3 from "../../assets/slide3.png";
import talent from "../../assets/Talent.png";
import { getMeAdmin } from "../../auth/api/adminapi/auth/ad.auth.api";
import { getMeManager } from "../../auth/api/managerapi/auth/ma.auth.api";
import { getMeUser } from "../../auth/api/employeeapi/auth/em.auth.api";
import { getMeSuperAdmin } from "../../auth/api/superadmin/auth/su.auth";
import { fetchMyPermissions } from "../../auth/api/permission/permission.api";
import { usePermissionStore } from "../../auth/store/permission/permissionStore";

async function fetchFullProfile(role) {
  if (role === "admin") return getMeAdmin();
  if (role === "manager") return getMeManager();
  if (role === "employee") return getMeUser();
  if (role === "superadmin") return getMeSuperAdmin();
  return null;
}

function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: authData, isLoading: authLoading } = useAuth();
  const { mutate: loginFn, isPending: isLoggingIn } = useLogin();

  const { mutate: sendAdminOtpFn, isPending: sendingAdminOtp } = useSendForgetPasswordOtp();
  const { mutate: verifyAdminOtpFn, isPending: verifyingAdminOtp } = useVerifyAdminOtp();

  const { mutate: sendSuperAdminOtpFn, isPending: sendingSuperAdminOtp } = useForgotPasswordSuperAdmin();
  const { mutate: verifySuperAdminOtpFn, isPending: verifyingSuperAdminOtp } = useVerifySuperAdminOtp();

  const { mutate: sendManagerOtpFn, isPending: sendingManagerOtp } = useForgetPasswordManager();
  const { mutate: verifyManagerOtpFn, isPending: verifyingManagerOtp } = useVerifyManagerOtpApi();

  const { mutate: sendEmployeeOtpFn, isPending: sendingEmployeeOtp } = useForgetPassword();
  const { mutate: verifyEmployeeOtpFn, isPending: verifyingEmployeeOtp } = useVerifyOtp();

  const [form, setForm] = useState({ email: "", password: "", otp: "", role: "admin" });
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [animationData, setAnimationData] = useState(null);
  const [showLoader, setShowLoader] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const images = [slide1, slide2, slide3];

  const navigateByRole = (role) => {
    if (role === "superadmin" || role === "super_admin") navigate("/superadmin-dashboard", { replace: true });
    else if (role === "admin") navigate("/dashboard", { replace: true });
    else if (role === "manager") navigate("/manager-dashboard", { replace: true });
    else navigate("/employee-dashboard", { replace: true });
  };

  useEffect(() => {
    if (!authLoading && authData) navigateByRole(authData.role);
  }, [authData, authLoading]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}loader.json`)
      .then((r) => r.json())
      .then(setAnimationData);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({});
  };

  const getErrorMessage = (err) =>
    err?.response?.data?.message || err?.message || "Something went wrong. Please try again.";

  const validate = () => {
    const newErrors = {};
    if (!form.email) newErrors.email = "Email is required";
    if (!form.password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const syncProfileToCache = async (role, fallbackData) => {
    localStorage.setItem("role", role);
    try {
      const fullData = await fetchFullProfile(role);
      const authPayload = { role, data: fullData ?? fallbackData };
      queryClient.setQueryData(["auth"], authPayload);
      try {
        const permissions = await fetchMyPermissions();
        usePermissionStore.getState().setPermissions(permissions);
      } catch (_) {}
      return authPayload;
    } catch {
      const authPayload = { role, data: fallbackData };
      queryClient.setQueryData(["auth"], authPayload);
      return authPayload;
    }
  };

  const handleLogin = () => {
    if (!validate()) return;
    setShowLoader(true);

    const payload =
      form.role === "manager"
        ? { role: form.role, work_email: form.email, password: form.password }
        : { role: form.role, identifier: form.email, password: form.password };

    loginFn(payload, {
      onSuccess: async (data) => {
        if (data?.token) {
          try {
            await fetch("http://localhost:47821/set-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: data.token }),
            });
          } catch (_) {}
        }
        await syncProfileToCache(form.role, data);
        setShowLoader(false);
        navigateByRole(form.role);
      },
      onError: (err) => {
        setShowLoader(false);
        setErrors({ general: getErrorMessage(err) });
      },
    });
  };

  const isSendingOtp = sendingAdminOtp || sendingSuperAdminOtp || sendingManagerOtp || sendingEmployeeOtp;
  const isVerifyingOtp = verifyingAdminOtp || verifyingSuperAdminOtp || verifyingManagerOtp || verifyingEmployeeOtp;

  const handleSendOtp = () => {
    if (!form.email) {
      setErrors({ email: "Email is required" });
      return;
    }
    const onSuccess = () => setStep("otp");
    const onError = (err) => setErrors({ email: getErrorMessage(err) });

    if (form.role === "admin") {
      sendAdminOtpFn(form.email, { onSuccess, onError });
    } else if (form.role === "superadmin") {
      sendSuperAdminOtpFn({ email: form.email }, { onSuccess, onError });
    } else if (form.role === "manager") {
      sendManagerOtpFn({ work_email: form.email }, { onSuccess, onError });
    } else if (form.role === "employee") {
      sendEmployeeOtpFn({ work_email: form.email }, { onSuccess, onError });
    }
  };

  const handleVerifyOtp = () => {
    if (!form.otp) {
      setErrors({ otp: "OTP is required" });
      return;
    }

    const onError = (err) => setErrors({ otp: getErrorMessage(err) });

    const onSuccess = async (data) => {
      const rawRole = data?.role ?? form.role;
      const role = rawRole === "super_admin" ? "superadmin" : rawRole;

      if (data?.token) {
        try {
          await fetch("http://localhost:47821/set-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: data.token }),
          });
        } catch (_) {}
      }

      await syncProfileToCache(role, data);
      setShowLoader(false);
      navigateByRole(role);
    };

    if (form.role === "admin") {
      verifyAdminOtpFn({ email: form.email, otp: form.otp }, { onSuccess, onError });
    } else if (form.role === "superadmin") {
      verifySuperAdminOtpFn({ email: form.email, otp: form.otp }, { onSuccess, onError });
    } else if (form.role === "manager") {
      verifyManagerOtpFn({ work_email: form.email, otp: form.otp }, { onSuccess, onError });
    } else if (form.role === "employee") {
      verifyEmployeeOtpFn({ work_email: form.email, otp: form.otp }, { onSuccess, onError });
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-cover bg-center px-4 py-8"
      style={{ backgroundImage: `url('${import.meta.env.BASE_URL}bg.jpeg')` }}
    >
      {showLoader && animationData && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <Player autoplay loop src={animationData} style={{ height: "140px", width: "140px" }} />
        </div>
      )}

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-5xl bg-white/90 backdrop-blur-md rounded-2xl shadow-xl flex flex-col md:flex-row overflow-hidden">
          <div className="w-full md:w-1/2 p-8">
            <img src={talent} alt="Talent" className="w-28 mb-6" />

            {step === "login" && (
              <>
                <h2 className="text-2xl font-bold text-[#730042] mb-1">Sign in</h2>
                <p className="text-gray-500 text-sm mb-4">Access your Talent account</p>

                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="w-full mb-3 p-3 border rounded-lg bg-white text-gray-700"
                >
                  <option value="superadmin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="employee">Employee</option>
                </select>

                {form.role === "superadmin" && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-[#730042]/8 border border-[#730042]/20 rounded-lg">
                    <span className="text-sm">🛡️</span>
                    <p className="text-xs text-[#730042] font-medium">
                      Super Admin — use your company work email
                    </p>
                  </div>
                )}

                {errors.general && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{errors.general}</p>
                  </div>
                )}

                <input
                  type="text"
                  name="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full mb-1 p-3 border rounded-lg"
                />
                {errors.email && <p className="text-red-500 text-sm mb-2">{errors.email}</p>}

                <div className="relative mt-2 mb-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#730042]"
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 cursor-pointer text-gray-500"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </span>
                </div>
                {errors.password && <p className="text-red-500 text-sm mb-2">{errors.password}</p>}

                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="w-full bg-[#730042] text-white py-3 rounded-lg mt-3 disabled:opacity-60"
                >
                  {isLoggingIn ? "Signing in..." : "Sign in"}
                </button>

                <div className="flex justify-between mt-4 text-sm text-gray-500">
                  <p onClick={() => setStep("email")} className="cursor-pointer hover:text-[#730042]">
                    Forgot Password?
                  </p>
                  <p
                    onClick={() => (window.location.href = "/talent/signup")}
                    className="cursor-pointer hover:text-[#730042] ml-auto"
                  >
                    Sign Up
                  </p>
                </div>
              </>
            )}

            {step === "email" && (
              <>
                <h2 className="text-xl font-bold text-[#730042] mb-4">Forgot Password</h2>
                <input
                  type="text"
                  name="email"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full mb-1 p-3 border rounded-lg"
                />
                {errors.email && <p className="text-red-500 text-sm mb-2">{errors.email}</p>}
                <button
                  onClick={handleSendOtp}
                  disabled={isSendingOtp}
                  className="w-full bg-[#730042] text-white py-3 rounded-lg disabled:opacity-60"
                >
                  {isSendingOtp ? "Sending..." : "Send OTP"}
                </button>
                <p
                  onClick={() => setStep("login")}
                  className="text-sm text-gray-500 mt-3 cursor-pointer hover:text-[#730042]"
                >
                  ← Back to login
                </p>
              </>
            )}

            {step === "otp" && (
              <>
                <h2 className="text-xl font-bold text-[#730042] mb-4">Enter OTP</h2>
                <input
                  type="text"
                  name="otp"
                  placeholder="Enter OTP"
                  value={form.otp}
                  onChange={handleChange}
                  className="w-full mb-1 p-3 border rounded-lg"
                />
                {errors.otp && <p className="text-red-500 text-sm mb-2">{errors.otp}</p>}
                <button
                  onClick={handleVerifyOtp}
                  disabled={isVerifyingOtp}
                  className="w-full bg-[#730042] text-white py-3 rounded-lg disabled:opacity-60"
                >
                  {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
                </button>
                <p
                  onClick={() => setStep("login")}
                  className="text-sm text-gray-500 mt-3 cursor-pointer hover:text-[#730042]"
                >
                  ← Back to login
                </p>
              </>
            )}
          </div>

          <div className="hidden md:flex w-1/2 bg-gray-50 items-center justify-center p-6">
            <div className="text-center">
              <img src={images[currentSlide]} alt="slide" className="w-full max-h-65 object-contain" />
              <h3 className="text-lg font-semibold text-[#730042] mt-4">Smart Secure Login</h3>
              <p className="text-gray-500 text-sm mt-2">
                Experience secure and seamless HRMS access with 2 factor authentication.
              </p>
              <div className="flex justify-center mt-4 gap-2">
                {images.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      currentSlide === index ? "bg-[#730042]" : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="w-full py-4 text-center text-gray-600 text-sm font-medium">
        © 2026, TechTorch Solutions Private Limited. All Rights Reserved.
      </footer>
    </div>
  );
}

export default React.memo(Login);