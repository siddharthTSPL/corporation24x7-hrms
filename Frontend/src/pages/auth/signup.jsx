import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRegisterAdmin } from "../../auth/server-state/adminauth/adminauth.hook";
import logo from "../../assets/logo1.png";
import slide1 from "../../assets/slide1.png";
import slide2 from "../../assets/slide2.png";
import slide3 from "../../assets/slide3.png";

export default function Register() {
  
  const navigate = useNavigate();
  const { mutate: registerFn, isPending, error, isSuccess } = useRegisterAdmin();

  const [form, setForm] = useState({
    organisation_name: "",
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = () => {
    if (!agree) return alert("Please accept Terms & Policy");
    registerFn(form);
  };

  return (
    <div
      className="min-h-screen relative flex items-center justify-center bg-cover bg-center px-4"
      style={{ backgroundImage: "url('/bg.jpeg')" }}
    >
      <div className="w-full max-w-5xl bg-white/90 backdrop-blur-md rounded-2xl shadow-xl flex flex-col md:flex-row overflow-hidden">
        
        {/* LEFT SIDE */}
        <div className="w-full md:w-1/2 p-8">
          <div className="flex justify-between items-center mb-6">
            <img src={logo} alt="logo" className="w-28" />
            
            <p
              onClick={() => navigate("/login")}
              className="text-sm text-gray-500 cursor-pointer hover:text-(--primary)"
            >
              Have a Talent Account? <span className="font-semibold">SIGN IN</span>
            </p>
          </div>

          <h2 className="text-2xl font-bold text-(--primary) mb-2">
            Sign up
          </h2>

          <p className="text-gray-500 text-sm mb-4">
            Create your Talent account
          </p>

          <input
            type="text"
            name="organisation_name"
            placeholder="Organisation Name"
            value={form.organisation_name}
            onChange={handleChange}
            className="w-full mb-3 p-3 border rounded-lg focus:ring-2 focus:ring-(--primary)"
          />

          <input
            type="email"
            name="email"
            placeholder="Email address"
            value={form.email}
            onChange={handleChange}
            className="w-full mb-3 p-3 border rounded-lg focus:ring-2 focus:ring-(--primary)"
          />

          <div className="relative mb-3">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-(--primary)"
            />

            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 cursor-pointer text-gray-500"
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

          <div className="flex items-start gap-2 mb-4 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={agree}
              onChange={() => setAgree(!agree)}
            />
            <p>
              I agree to the{" "}
              <span className="text-(--primary) cursor-pointer">
                Terms of Service
              </span>{" "}
              and{" "}
              <span className="text-(--primary) cursor-pointer">
                Privacy Policy
              </span>.
            </p>
          </div>

          {error && <p className="text-red-500 text-sm">{error.message}</p>}

          {isSuccess && (
            <p className="text-green-600 text-sm">
              ✅ Check your email to verify account
            </p>
          )}

          <button
            onClick={handleRegister}
            disabled={isPending}
            className="w-full bg-(--primary) text-white py-3 rounded-lg mt-2 hover:opacity-90"
          >
            {isPending ? "Registering..." : "Register"}
          </button>
        </div>

        {/* RIGHT SIDE */}
        <div className="hidden md:flex w-1/2 bg-gray-50 items-center justify-center p-6">
          <div className="text-center">
            <img
              src={slide1}
              alt="illustration"
              className="w-full max-h-65 object-contain"
            />

            <h3 className="text-lg font-semibold text-(--primary) mt-4">
              Smart Secure Signup
            </h3>

            <p className="text-gray-500 text-sm mt-2">
              Create your account securely and manage your workforce efficiently.
            </p>
          </div>
        </div>
      </div>

      <p className="fixed bottom-2 left-0 w-full text-center text-gray-600 text-sm font-medium">
        © 2026, TechTorch Solutions Private Limited. All Rights Reserved.
      </p>
    </div>
  );
}