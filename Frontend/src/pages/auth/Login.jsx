import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAdminLogin,
  useGetMeAdmin,
} from "../../auth/server-state/adminauth/adminauth.hook";
import { Player } from "@lottiefiles/react-lottie-player";

export default function Login() {
  const navigate = useNavigate();
  const { data: admin } = useGetMeAdmin();
  const { mutate: loginAdminFn, isPending, error } = useAdminLogin();
const [showLoader, setShowLoader] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    otp: "",
  });

  const [errors, setErrors] = useState({});
  const [step, setStep] = useState("login");
  const [verified, setVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
const [animationData, setAnimationData] = useState(null);
  const images = [
    "/src/assets/slide1.png",
    "/src/assets/slide2.png",
    "/src/assets/slide3.png",
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  
  useEffect(() => {
    if (admin) {
      navigate("/dashboard", { replace: true });
    }
  }, [admin, navigate]);

 useEffect(() => {
  fetch("/loader.json")
    .then((res) => res.json())
    .then((data) => setAnimationData(data));
}, []);
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 2500); // 2.5 sec

    return () => clearInterval(interval);
  }, []);

  const validate = () => {
    let newErrors = {};

    if (!form.email) newErrors.email = "Email is required";
    if (!form.password) newErrors.password = "Password is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = () => {
  if (!validate()) return;

  setShowLoader(true); // start loader

  const startTime = Date.now();

  loginAdminFn(
    {
      identifier: form.email,
      password: form.password,
    },
    {
      onSettled: () => {
        const elapsed = Date.now() - startTime;
      const remainingTime = 300000 - elapsed; 
        setTimeout(() => {
          setShowLoader(false);
        }, remainingTime > 0 ? remainingTime : 0);
      },
    }
  );
};

  const handleSendOtp = () => {
    setStep("otp");
  };

  const handleVerifyOtp = () => {
    setVerified(true);
    setStep("login");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center px-4 relative"
      style={{ backgroundImage: "url('/bg.jpeg')" }}
    >
      {/* ✅ LOADER */}
     {showLoader && animationData && (
  <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
    <Player
      autoplay
      loop
      src={animationData}
      style={{ height: "140px", width: "140px" }}
    />
  </div>
)}
      {/* MAIN CONTAINER */}
      <div className="w-full max-w-5xl bg-white/90 backdrop-blur-md rounded-2xl shadow-xl flex flex-col md:flex-row overflow-hidden">

        {/* LEFT SIDE */}
        <div className="w-full md:w-1/2 p-8">
          <img src="src/assets/logo1.png" alt="logo" className="w-28 mb-6" />

          {step === "login" && (
            <>
              <h2 className="text-2xl font-bold text-[var(--primary)] mb-2">
                Sign in
              </h2>
              <p className="text-gray-500 text-sm mb-4">
                Access your Talent account
              </p>

              <input
                type="text"
                name="email"
                placeholder="Email address"
                value={form.email}
                onChange={handleChange}
                className="w-full mb-3 p-3 border rounded-lg focus:ring-2 focus:ring-[var(--primary)]"
              />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email}</p>
              )}

              <div className="relative mb-3">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[var(--primary)]"
                />

                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 cursor-pointer text-gray-500"
                >
                  {showPassword ? "🙈" : "👁️"}
                </span>

                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.password}
                  </p>
                )}
              </div>

              <button
                onClick={handleLogin}
                className="w-full bg-[var(--primary)] text-white py-3 rounded-lg mt-3"
              >
                Next
              </button>

              {/* ✅ SAME ROW */}
              <div className="flex justify-between mt-4 text-sm text-gray-500">
                <p
                  onClick={() => setStep("email")}
                  className="cursor-pointer hover:text-[var(--primary)]"
                >
                  Forgot Password?
                </p>

                <p
                  onClick={() => navigate("/signup")}
                  className="cursor-pointer hover:text-[var(--primary)]"
                >
                  Sign Up
                </p>
              </div>

              {verified && (
                <p className="text-green-600 text-sm mt-2">
                  ✅ Email Verified
                </p>
              )}
            </>
          )}

          {step === "email" && (
            <>
              <h2 className="text-xl font-bold text-[var(--primary)] mb-4">
                Enter Email
              </h2>

              <input
                type="text"
                name="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={handleChange}
                className="w-full mb-3 p-3 border rounded-lg"
              />

              <button
                onClick={handleSendOtp}
                className="w-full bg-[var(--primary)] text-white py-3 rounded-lg"
              >
                Send OTP
              </button>
            </>
          )}

          {step === "otp" && (
            <>
              <h2 className="text-xl font-bold text-[var(--primary)] mb-4">
                Enter OTP
              </h2>

              <input
                type="text"
                name="otp"
                placeholder="Enter OTP"
                value={form.otp}
                onChange={handleChange}
                className="w-full mb-3 p-3 border rounded-lg"
              />

              <button
                onClick={handleVerifyOtp}
                className="w-full bg-[var(--primary)] text-white py-3 rounded-lg"
              >
                Verify OTP
              </button>
            </>
          )}
        </div>

        {/* RIGHT SIDE */}
        <div className="hidden md:flex w-1/2 bg-gray-50 items-center justify-center p-6">
          <div className="text-center">
            <img
              src={images[currentSlide]}
              alt="slide"
              className="w-full max-h-65 object-contain"
            />

            <h3 className="text-lg font-semibold text-[var(--primary)] mt-4">
              Smart Secure Login
            </h3>

            <p className="text-gray-500 text-sm mt-2">
              Experience secure and seamless HRMS access with 2 factor authentication.
            </p>

            <div className="flex justify-center mt-4 gap-2">
              {images.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    currentSlide === index
                      ? "bg-[var(--primary)]"
                      : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}