import { useState } from "react";
import { useRegisterAdmin } from "../../auth/server-state/adminauth/adminauth.hook";

export default function Register() {
  const { mutate: registerFn, isPending, error, isSuccess } = useRegisterAdmin();

  const [form, setForm] = useState({
    organisation_name: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = () => {
    registerFn(form);
  };

  return (
    <div>
      <input
        name="organisation_name"
        placeholder="Organisation"
        onChange={handleChange}
      />

      <input
        name="email"
        placeholder="Email"
        onChange={handleChange}
      />

      <input
        name="password"
        placeholder="Password"
        type="password"
        onChange={handleChange}
      />

      {error && <p>{error.message}</p>}

      {isSuccess && (
        <p style={{ color: "green" }}>
          ✅ Check your email to verify account
        </p>
      )}

      <button onClick={handleRegister} disabled={isPending}>
        {isPending ? "Registering..." : "Register"}
      </button>
    </div>
  );
}