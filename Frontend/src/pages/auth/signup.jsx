import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRegisterSuperAdmin } from "../../auth/server-state/superadmin/auth/suauth.hook";
import logo from "../../assets/logo1.png";
import slide1 from "../../assets/slide1.png";

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

const INDUSTRIES = [
  "Technology", "Healthcare", "Finance", "Education", "Retail",
  "Manufacturing", "Real Estate", "Hospitality", "Logistics", "Other",
];

export default function SuperAdminRegister() {
  const navigate = useNavigate();
  const { mutate: registerFn, isPending, error, isSuccess } = useRegisterSuperAdmin();

  const [form, setForm] = useState({
    f_name: "",
    l_name: "",
    email: "",
    password: "",
    organisation_name: "",
    phone: "",
    company_address: "",
    company_size: "",
    industry: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [step, setStep] = useState(1); // step 1: personal, step 2: company

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleNext = () => {
    const { f_name, l_name, email, password } = form;
    if (!f_name || !l_name || !email || !password) {
      return alert("Please fill in all required fields.");
    }
    setStep(2);
  };

  const handleRegister = () => {
    if (!agree) return alert("Please accept the Terms & Policy.");
    if (!form.organisation_name) return alert("Organisation name is required.");
    registerFn(form);
  };

  return (
    <div
      className="min-h-screen relative flex items-center justify-center bg-cover bg-center px-4 py-8"
      style={{ backgroundImage: "url('/bg.jpeg')" }}
    >
      <div className="w-full max-w-5xl bg-white/90 backdrop-blur-md rounded-2xl shadow-xl flex flex-col md:flex-row overflow-hidden">

        {/* ── LEFT SIDE ── */}
        <div className="w-full md:w-1/2 p-8">

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <img src={logo} alt="logo" className="w-28" />
            <p
              onClick={() => navigate("/login")}
              className="text-sm text-gray-500 cursor-pointer hover:text-(--primary)"
            >
              Already have an account?{" "}
              <span className="font-semibold">SIGN IN</span>
            </p>
          </div>

          <h2 className="text-2xl font-bold text-(--primary) mb-1">
            Create Super Admin Account
          </h2>
          <p className="text-gray-500 text-sm mb-5">
            Set up your organisation on the platform
          </p>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                    ${step >= s ? "bg-[#730042] text-white" : "bg-gray-200 text-gray-500"}`}
                >
                  {s}
                </div>
                <span className={`text-sm ${step >= s ? "text-[#730042] font-medium" : "text-gray-400"}`}>
                  {s === 1 ? "Personal Info" : "Company Info"}
                </span>
                {s < 2 && <div className={`w-8 h-0.5 ${step > s ? "bg-[#730042]" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>

          {/* ── STEP 1: Personal Info ── */}
          {step === 1 && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  name="f_name"
                  placeholder="First Name *"
                  value={form.f_name}
                  onChange={handleChange}
                  className="w-1/2 p-3 border rounded-lg focus:ring-2 focus:ring-[#730042] outline-none"
                />
                <input
                  type="text"
                  name="l_name"
                  placeholder="Last Name *"
                  value={form.l_name}
                  onChange={handleChange}
                  className="w-1/2 p-3 border rounded-lg focus:ring-2 focus:ring-[#730042] outline-none"
                />
              </div>

              <input
                type="email"
                name="email"
                placeholder="Work Email Address *"
                value={form.email}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#730042] outline-none"
              />

              <p className="text-xs text-gray-400 -mt-2 ml-1">
                ⚠️ Personal emails (Gmail, Yahoo, etc.) are not allowed.
              </p>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password *"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#730042] outline-none"
                />
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 cursor-pointer text-gray-500"
                >
                  {showPassword ? "🙈" : "👁️"}
                </span>
              </div>

              <input
                type="tel"
                name="phone"
                placeholder="Phone Number (optional)"
                value={form.phone}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#730042] outline-none"
              />

              <button
                onClick={handleNext}
                className="w-full bg-[#730042] text-white py-3 rounded-lg mt-1 hover:opacity-90 font-medium"
              >
                Next →
              </button>
            </div>
          )}

          {/* ── STEP 2: Company Info ── */}
          {step === 2 && (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                name="organisation_name"
                placeholder="Organisation Name *"
                value={form.organisation_name}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#730042] outline-none"
              />

              <input
                type="text"
                name="company_address"
                placeholder="Company Address (optional)"
                value={form.company_address}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#730042] outline-none"
              />

              <div className="flex gap-3">
                <select
                  name="company_size"
                  value={form.company_size}
                  onChange={handleChange}
                  className="w-1/2 p-3 border rounded-lg focus:ring-2 focus:ring-[#730042] outline-none text-gray-600"
                >
                  <option value="">Company Size</option>
                  {COMPANY_SIZES.map((s) => (
                    <option key={s} value={s}>{s} employees</option>
                  ))}
                </select>

                <select
                  name="industry"
                  value={form.industry}
                  onChange={handleChange}
                  className="w-1/2 p-3 border rounded-lg focus:ring-2 focus:ring-[#730042] outline-none text-gray-600"
                >
                  <option value="">Industry</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-start gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={() => setAgree(!agree)}
                  className="mt-0.5"
                />
                <p>
                  I agree to the{" "}
                  <span className="text-[#730042] cursor-pointer">Terms of Service</span>{" "}
                  and{" "}
                  <span className="text-[#730042] cursor-pointer">Privacy Policy</span>.
                </p>
              </div>

              {error && (
                <p className="text-red-500 text-sm">
                  ❌ {error?.response?.data?.message || error.message}
                </p>
              )}

              {isSuccess && (
                <p className="text-green-600 text-sm">
                  ✅ Account created! Please check your email to verify.
                </p>
              )}

              <div className="flex gap-3 mt-1">
                <button
                  onClick={() => setStep(1)}
                  className="w-1/3 border border-[#730042] text-[#730042] py-3 rounded-lg hover:bg-[#730042]/5 font-medium"
                >
                  ← Back
                </button>
                <button
                  onClick={handleRegister}
                  disabled={isPending}
                  className="w-2/3 bg-[#730042] text-white py-3 rounded-lg hover:opacity-90 font-medium"
                >
                  {isPending ? "Creating Account..." : "Create Account"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT SIDE ── */}
        <div className="hidden md:flex w-1/2 bg-gray-50 items-center justify-center p-6">
          <div className="text-center">
            <img
              src={slide1}
              alt="illustration"
              className="w-full max-h-65 object-contain"
            />
            <h3 className="text-lg font-semibold text-[#730042] mt-4">
              Full Platform Control
            </h3>
            <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">
              As a Super Admin, you manage your entire organisation, team structure, and platform settings from one place.
            </p>

            {/* Plan badge */}
            <div className="mt-6 inline-flex items-center gap-2 bg-[#730042]/10 text-[#730042] text-xs font-semibold px-4 py-2 rounded-full">
              🎁 30-day free trial included
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