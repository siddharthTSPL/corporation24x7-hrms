import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../../api";
export default function Login() {
  const navigate = useNavigate();

  const [step, setStep] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", otp: "" });
  const [errors, setErrors] = useState({});
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [verified, setVerified] = useState(false);

  const [currentSlide, setCurrentSlide] = useState(0);
  const images = ["/slide1.jpeg", "/slide2.jpeg", "/slide3.jpeg"];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateLogin = () => {
  let newErrors = {};

  if (!form.email) newErrors.email = "Email required";
  if (!form.password) newErrors.password = "Password required";

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

  const handleLogin = async () => {
  if (!validateLogin()) return;

  try {
    const res = await api.post("", {
  identifier: form.email,   
  password: form.password
});

    console.log(res.data);

    alert("Login successful ✅");

    // store data (optional)
    localStorage.setItem("admin", JSON.stringify(res.data.admin));

    navigate("/dashboard");

  } catch (error) {
    console.log(error);

    setErrors({
      api: error.response?.data?.message || "Login failed"
    });
  }
};

  const handleSendOtp = () => {
    if (!form.email) {
      setErrors({ email: "Enter email" });
      return;
    }
    const otp = Math.floor(100000 + Math.random() * 900000);
    setGeneratedOtp(otp.toString());
    alert("OTP (Demo): " + otp);
    setStep("otp");
  };

  const handleVerifyOtp = () => {
    if (form.otp === generatedOtp) {
      setVerified(true);
      setStep("login");
      alert("Verified! Now login.");
    } else {
      setErrors({ otp: "Invalid OTP" });
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center px-4"
      style={{ backgroundImage: "url('/bg.jpeg')" }}
    >
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
              {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}

              <input
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                className="w-full mb-3 p-3 border rounded-lg focus:ring-2 focus:ring-[var(--primary)]"
              />
              {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}

              <button
                onClick={handleLogin}
                className="w-full bg-[var(--primary)] text-white py-3 rounded-lg mt-3"
              >
                Next
              </button>

              {verified && (
                <p className="text-green-600 text-sm mt-2">✅ Email Verified</p>
              )}

              <p
                onClick={() => setStep("email")}
                className="text-sm text-gray-500 mt-4 cursor-pointer hover:text-[var(--primary)]"
              >
                Forgot Password?
              </p>
              <p
                onClick={() => setStep("email")}
                className="text-sm text-gray-500 mt-4 cursor-pointer hover:text-[var(--primary)]"
              >
                Sign Up ?
              </p>
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

              {errors.otp && <p className="text-red-500 text-sm">{errors.otp}</p>}

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
              className="w-full max-h-[260px] object-contain"
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
