import { useState, useEffect } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Player } from "@lottiefiles/react-lottie-player";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import {
  useUnifiedLogin,
  useUnifiedSendForgotPasswordOtp,
  useUnifiedVerifyForgotPasswordOtp,
  useUnifiedResetPassword,
} from "../../auth/store/unifiedauth/Unifiedauth.hook";
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
import { setAgentToken } from "../../pages/utils/Desktopagent";

// Prefer the backend's explicit account-type bucket (superadmin/admin/manager/employee).
// Falls back to normalizing the raw role string for older responses that don't send accountType.
const normalizeRole = (data) => {
  if (data?.accountType) return data.accountType;
  const role = data?.role;
  if (role === "super_admin") return "superadmin";
  if (role === "senior_admin" || role === "official") return "admin";
  if (role === "senior_manager") return "manager";
  return role;
};

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

  const { mutate: loginFn, isPending: isLoggingIn } = useUnifiedLogin();
  const { mutate: sendOtpFn, isPending: isSendingOtp } = useUnifiedSendForgotPasswordOtp();
  const { mutate: verifyOtpFn, isPending: isVerifyingOtp } = useUnifiedVerifyForgotPasswordOtp();
  const { mutate: resetPasswordFn, isPending: isResettingPassword } = useUnifiedResetPassword();

  const [form, setForm] = useState({ email: "", password: "", otp: "", newPassword: "", confirmPassword: "" });
  const [verifiedAuthPayload, setVerifiedAuthPayload] = useState(null);
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
        const permissions = await fetchMyPermissions(role);
        usePermissionStore.getState().setPermissions(role, permissions);
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

    loginFn(
      { email: form.email, password: form.password },
      {
        onSuccess: (data) => finishPostAuth(data),
        onError: (err) => {
          setShowLoader(false);
          setErrors({ general: getErrorMessage(err) });
        },
      }
    );
  };

  const handleSendOtp = () => {
    if (!form.email) {
      setErrors({ email: "Email is required" });
      return;
    }
    sendOtpFn(form.email, {
      onSuccess: () => setStep("otp"),
      onError: (err) => setErrors({ email: getErrorMessage(err) }),
    });
  };

  const finishPostAuth = async (data) => {
    const role = normalizeRole(data);
    if (data?.token) {
      setAgentToken(data.token);
    }
    await syncProfileToCache(role, data);
    setShowLoader(false);
    navigateByRole(role);
  };

  const handleVerifyOtp = () => {
    if (!form.otp) {
      setErrors({ otp: "OTP is required" });
      return;
    }

    verifyOtpFn(
      { email: form.email, otp: form.otp },
      {
        onSuccess: (data) => {
          // OTP is verified and the server already logged the account in
          // (token cookie set) — it also issued a resetToken cookie so the
          // person can optionally set a brand new password here.
          setVerifiedAuthPayload(data);
          setErrors({});
          setStep("reset");
        },
        onError: (err) => setErrors({ otp: getErrorMessage(err) }),
      }
    );
  };

  const handleSetNewPassword = () => {
    if (!form.newPassword || !form.confirmPassword) {
      setErrors({ newPassword: "Both password fields are required" });
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setErrors({ newPassword: "Passwords do not match" });
      return;
    }
    if (form.newPassword.length < 8) {
      setErrors({ newPassword: "Password must be at least 8 characters" });
      return;
    }

    setShowLoader(true);
    resetPasswordFn(
      { newPassword: form.newPassword, confirmPassword: form.confirmPassword },
      {
        onSuccess: async () => {
          await finishPostAuth(verifiedAuthPayload);
        },
        onError: (err) => {
          setShowLoader(false);
          setErrors({ newPassword: getErrorMessage(err) });
        },
      }
    );
  };

  const handleSkipPasswordReset = async () => {
    setShowLoader(true);
    await finishPostAuth(verifiedAuthPayload);
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
  onClick={() => (window.location.href = "https://torchxsuite.com/signup")}
  className="cursor-pointer hover:text-[#730042] ml-auto"
>
  Sign Up
</p>
                </div>

                <div className="flex items-center gap-3 my-4">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">OR</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/live-attendance")}
                  className="w-full flex items-center justify-center gap-2 border-2 border-[#730042]/20 text-[#730042] font-semibold py-3 rounded-lg hover:bg-[#730042]/5 transition"
                >
                  <span>🪪</span>
                  Live Attendance (Face Check-in)
                </button>
                <p className="text-xs text-gray-400 text-center mt-2">
                  For office kiosk/tablet devices — employees check in/out with their face, no password needed.
                </p>
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

            {step === "reset" && (
              <>
                <h2 className="text-xl font-bold text-[#730042] mb-1">Set a New Password</h2>
                <p className="text-gray-500 text-sm mb-4">
                  Optional — you're already signed in. Set a new password now, or skip and do it later.
                </p>
                <input
                  type="password"
                  name="newPassword"
                  placeholder="New password"
                  value={form.newPassword}
                  onChange={handleChange}
                  className="w-full mb-1 p-3 border rounded-lg"
                />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm new password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="w-full mt-2 mb-1 p-3 border rounded-lg"
                />
                {errors.newPassword && <p className="text-red-500 text-sm mb-2">{errors.newPassword}</p>}
                <button
                  onClick={handleSetNewPassword}
                  disabled={isResettingPassword}
                  className="w-full bg-[#730042] text-white py-3 rounded-lg mt-3 disabled:opacity-60"
                >
                  {isResettingPassword ? "Updating..." : "Set New Password"}
                </button>
                <p
                  onClick={handleSkipPasswordReset}
                  className="text-sm text-gray-500 mt-3 cursor-pointer hover:text-[#730042] text-center"
                >
                  Skip for now, continue to dashboard →
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
