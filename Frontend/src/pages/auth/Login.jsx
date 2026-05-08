import { useState, useEffect } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { Player } from "@lottiefiles/react-lottie-player";
import { useLogin } from "../../auth/store/getmeauth/getuselogin";
import { useSendForgetPasswordOtp, useVerifyAdminOtp } from "../../auth/server-state/adminauth/adminauth.hook";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";

function Login() {
  const navigate = useNavigate();
  const { data: authData, isLoading: authLoading } = useAuth();
  const { mutate: loginFn, isPending: isLoggingIn } = useLogin();
  const { mutate: sendOtpFn, isPending: sendingOtp } = useSendForgetPasswordOtp();
  const { mutate: verifyOtpFn, isPending: verifyingOtp } = useVerifyAdminOtp();
  const [form, setForm] = useState({ email: "", password: "", otp: "", role: "admin" });
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState("login");
  const [verified, setVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [animationData, setAnimationData] = useState(null);
  const [showLoader, setShowLoader] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const images = ["/src/assets/slide1.png", "/src/assets/slide2.png", "/src/assets/slide3.png"];

  const navigateByRole = (role) => {
    if (role === "admin") navigate("/dashboard", { replace: true });
    else if (role === "manager") navigate("/manager-dashboard", { replace: true });
    else navigate("/employee-dashboard", { replace: true });
  };

  useEffect(() => {
    if (!authLoading && authData) {
      navigateByRole(authData.role);
    }
  }, [authData, authLoading]);

  useEffect(() => {
    fetch("/loader.json").then((r) => r.json()).then(setAnimationData);
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
          } catch (_) {
            // Agent not running — skip silently
          }
        }
        navigateByRole(form.role);
      },
      onError: (err) => {
        setShowLoader(false);
        setErrors({ general: getErrorMessage(err) });
      },
    });
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

  const handleVerifyOtp = () => {
    if (!form.otp) {
      setErrors({ otp: "OTP is required" });
      return;
    }
    verifyOtpFn(
      { email: form.email, otp: form.otp },
      {
        onSuccess: () => {
          setVerified(true);
          setStep("login");
        },
        onError: (err) => setErrors({ otp: getErrorMessage(err) }),
      }
    );
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center px-4 relative"
      style={{ backgroundImage: "url('/bg.jpeg')" }}
    >
      {showLoader && animationData && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <Player autoplay loop src={animationData} style={{ height: "140px", width: "140px" }} />
        </div>
      )}

      <div className="w-full max-w-5xl bg-white/90 backdrop-blur-md rounded-2xl shadow-xl flex flex-col md:flex-row overflow-hidden">
        <div className="w-full md:w-1/2 p-8">
          <img src="src/assets/TorchX.svg" alt="logo" className="w-28 mb-6" />

          {step === "login" && (
            <>
              <h2 className="text-2xl font-bold text-[#730042] mb-2">Sign in</h2>
              <p className="text-gray-500 text-sm mb-4">Access your Talent account</p>

              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full mb-3 p-3 border rounded-lg bg-white text-gray-700"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="employee">Employee</option>
              </select>

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
                {form.role === "admin" && (
                  <p onClick={() => setStep("email")} className="cursor-pointer hover:text-[#730042]">
                    Forgot Password?
                  </p>
                )}
                <p onClick={() => navigate("/signup")} className="cursor-pointer hover:text-[#730042] ml-auto">
                  Sign Up
                </p>
              </div>

              {verified && <p className="text-green-600 text-sm mt-2">✅ Email Verified</p>}
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
                disabled={sendingOtp}
                className="w-full bg-[#730042] text-white py-3 rounded-lg disabled:opacity-60"
              >
                {sendingOtp ? "Sending..." : "Send OTP"}
              </button>
              <p onClick={() => setStep("login")} className="text-sm text-gray-500 mt-3 cursor-pointer hover:text-[#730042]">
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
                disabled={verifyingOtp}
                className="w-full bg-[#730042] text-white py-3 rounded-lg disabled:opacity-60"
              >
                {verifyingOtp ? "Verifying..." : "Verify OTP"}
              </button>
              <p onClick={() => setStep("login")} className="text-sm text-gray-500 mt-3 cursor-pointer hover:text-[#730042]">
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
                  className={`w-2 h-2 rounded-full ${currentSlide === index ? "bg-[#730042]" : "bg-gray-300"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="fixed bottom-2 left-0 w-full text-center text-gray-600 text-sm font-medium">
        © 2026, TechTorch Solutions Private Limited. All Rights Reserved.
      </p>
    </div>
  );
}

export default React.memo(Login);