import { useState } from "react";

export default function SettingsPage() {
  const [tab, setTab] = useState("profile");

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [password, setPassword] = useState({
    current: "",
    newPass: "",
    confirm: "",
  });

  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPassword({ ...password, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-6">

      {/* HEADER */}
      <h1 className="text-2xl font-bold text-[var(--primary)] mb-6">
        Settings
      </h1>

      <div className="flex flex-col md:flex-row gap-6">

        {/* SIDEBAR */}
        <div className="w-full md:w-1/4 bg-white rounded-xl shadow p-4">
          <ul className="space-y-2">
            {[
              { key: "profile", label: "Profile" },
              { key: "password", label: "Password" },
              { key: "notifications", label: "Notifications" },
              { key: "system", label: "System" },
            ].map((item) => (
              <li
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`p-3 rounded-lg cursor-pointer text-sm ${
                  tab === item.key
                    ? "bg-[var(--primary)] text-white"
                    : "hover:bg-gray-100"
                }`}
              >
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        {/* CONTENT */}
        <div className="w-full md:w-3/4 bg-white rounded-xl shadow p-6">

          {/* PROFILE */}
          {tab === "profile" && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-[var(--primary)]">
                Profile Settings
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  name="name"
                  placeholder="Full Name"
                  onChange={handleProfileChange}
                  className="p-3 border rounded-lg"
                />

                <input
                  name="email"
                  placeholder="Email"
                  onChange={handleProfileChange}
                  className="p-3 border rounded-lg"
                />

                <input
                  name="phone"
                  placeholder="Phone"
                  onChange={handleProfileChange}
                  className="p-3 border rounded-lg"
                />
              </div>

              <button className="mt-4 bg-[var(--primary)] text-white px-6 py-2 rounded-lg">
                Save Changes
              </button>
            </div>
          )}

          {/* PASSWORD */}
          {tab === "password" && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-[var(--primary)]">
                Change Password
              </h2>

              <div className="grid gap-4 max-w-md">
                <input
                  type="password"
                  name="current"
                  placeholder="Current Password"
                  onChange={handlePasswordChange}
                  className="p-3 border rounded-lg"
                />

                <input
                  type="password"
                  name="newPass"
                  placeholder="New Password"
                  onChange={handlePasswordChange}
                  className="p-3 border rounded-lg"
                />

                <input
                  type="password"
                  name="confirm"
                  placeholder="Confirm Password"
                  onChange={handlePasswordChange}
                  className="p-3 border rounded-lg"
                />
              </div>

              <button className="mt-4 bg-[var(--primary)] text-white px-6 py-2 rounded-lg">
                Update Password
              </button>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {tab === "notifications" && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-[var(--primary)]">
                Notifications
              </h2>

              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <span>Email Notifications</span>
                  <input type="checkbox" />
                </label>

                <label className="flex items-center justify-between">
                  <span>SMS Alerts</span>
                  <input type="checkbox" />
                </label>

                <label className="flex items-center justify-between">
                  <span>System Updates</span>
                  <input type="checkbox" />
                </label>
              </div>
            </div>
          )}

          {/* SYSTEM */}
          {tab === "system" && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-[var(--primary)]">
                System Settings
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select className="p-3 border rounded-lg">
                  <option>Theme: Light</option>
                  <option>Theme: Dark</option>
                </select>

                <select className="p-3 border rounded-lg">
                  <option>Language: English</option>
                  <option>Hindi</option>
                </select>
              </div>

              <button className="mt-4 bg-[var(--primary)] text-white px-6 py-2 rounded-lg">
                Save Settings
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
