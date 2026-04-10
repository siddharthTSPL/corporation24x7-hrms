import { useState, useEffect } from "react";
import React from "react";
import { useEditAdminProfile, useChangeAdminPassword } from "../../auth/server-state/adminauth/adminauth.hook";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, Eye, EyeOff } from "lucide-react";

function SettingsPage() {
  const [tab, setTab] = useState("profile");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const queryClient = useQueryClient();
  const { data: auth } = useAuth();
  const adminData = auth?.data;

  const editProfileMutation = useEditAdminProfile();
  const changePasswordMutation = useChangeAdminPassword();

  const avatarStyles = [
    "avataaars", "bottts", "personas", "lorelei",
    "micah", "open-peeps", "big-ears", "croodles",
  ];

  const [profile, setProfile] = useState({
    organisation_name: "",
    email: "",
    phone: "",
    profile_image: "",
  });

  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirm: "",
  });

  useEffect(() => {
    if (adminData) {
      setProfile({
        organisation_name: adminData.organisation_name || "",
        email: adminData.email || "",
        phone: adminData.phone || "",
        profile_image: adminData.profile_image || "",
      });
    }
  }, [adminData]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const getErrorMessage = (err) =>
    err?.response?.data?.message || err?.message || "Something went wrong";

  // After every successful edit, update the cache immediately so UI reflects change without refresh
  const onEditSuccess = (updatedAdmin) => {
    queryClient.setQueryData(["auth"], (old) => {
      if (!old) return old;
      return { ...old, data: { ...old.data, ...updatedAdmin } };
    });
    // Also invalidate so it refetches fresh data
    queryClient.invalidateQueries({ queryKey: ["auth"] });
  };

  const handleAvatarSelect = (style) => {
    const initials = profile.organisation_name
      .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "default";

    const avatarUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${initials}`;

    // Update local state immediately for instant UI feedback
    setProfile((prev) => ({ ...prev, profile_image: avatarUrl }));

    editProfileMutation.mutate(
      { phone: profile.phone, profile_image: avatarUrl },
      {
        onSuccess: (data) => {
          onEditSuccess(data.admin || { profile_image: avatarUrl });
          showMessage("success", "Avatar updated successfully!");
        },
        onError: (err) => {
          showMessage("error", getErrorMessage(err));
        },
      }
    );
  };

  const handleSavePhone = () => {
    if (!profile.phone) {
      showMessage("error", "Phone number is required");
      return;
    }

    editProfileMutation.mutate(
      { phone: profile.phone, profile_image: profile.profile_image },
      {
        onSuccess: (data) => {
          onEditSuccess(data.admin || { phone: profile.phone });
          showMessage("success", "Phone number updated successfully!");
        },
        onError: (err) => {
          showMessage("error", getErrorMessage(err));
        },
      }
    );
  };

  const handleRemoveAvatar = () => {
    setProfile((prev) => ({ ...prev, profile_image: "" }));

    editProfileMutation.mutate(
      { phone: profile.phone, profile_image: "" },
      {
        onSuccess: (data) => {
          onEditSuccess(data.admin || { profile_image: "" });
          showMessage("success", "Avatar removed successfully!");
        },
        onError: (err) => {
          showMessage("error", getErrorMessage(err));
        },
      }
    );
  };

  const handleChangePassword = () => {
    if (!password.currentPassword || !password.newPassword) {
      showMessage("error", "All password fields are required");
      return;
    }
    if (password.newPassword !== password.confirm) {
      showMessage("error", "New passwords do not match");
      return;
    }
    if (password.newPassword.length < 6) {
      showMessage("error", "Password must be at least 6 characters");
      return;
    }

    changePasswordMutation.mutate(
      { currentPassword: password.currentPassword, newPassword: password.newPassword },
      {
        onSuccess: () => {
          setPassword({ currentPassword: "", newPassword: "", confirm: "" });
          showMessage("success", "Password changed successfully");
        },
        onError: (err) => {
          showMessage("error", getErrorMessage(err));
        },
      }
    );
  };

  if (!adminData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-2">Manage your profile and account preferences</p>
      </div>

      {message.text && (
        <div
          className={`fixed top-4 right-4 rounded-lg shadow-lg p-4 flex items-center gap-3 z-50 ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <Check className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <p className={`text-sm font-medium ${message.type === "success" ? "text-emerald-900" : "text-red-900"}`}>
            {message.text}
          </p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-64 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-8">
            <nav className="space-y-1 p-4">
              {[
                { key: "profile", label: "Profile" },
                { key: "password", label: "Password" },
                { key: "system", label: "System" },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    tab === item.key ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

            {tab === "profile" && (
              <div className="p-6 md:p-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-900">Profile Settings</h2>
                  <p className="text-slate-600 text-sm mt-2">Manage your avatar and contact info</p>
                </div>

                <div className="mb-8 pb-8 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-900 mb-6">Professional Avatar</h3>

                  <div className="mb-8 flex flex-col items-center">
                    {profile.profile_image ? (
                      <img
                        src={profile.profile_image}
                        alt="Profile Avatar"
                        className="w-32 h-32 rounded-full border-4 border-blue-100 shadow-md"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-blue-500 flex items-center justify-center text-white text-4xl font-bold shadow-md">
                        {profile.organisation_name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?"}
                      </div>
                    )}
                    <p className="text-sm text-slate-600 mt-4">Current avatar</p>
                    {profile.profile_image && (
                      <button
                        onClick={handleRemoveAvatar}
                        disabled={editProfileMutation.isPending}
                        className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove Avatar
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-4">
                      Choose Avatar Style
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {avatarStyles.map((style) => {
                        const initials = profile.organisation_name
                          .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "default";
                        const previewUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${initials}`;

                        return (
                          <button
                            key={style}
                            onClick={() => handleAvatarSelect(style)}
                            disabled={editProfileMutation.isPending}
                            className={`p-3 rounded-lg border-2 transition-all duration-200 hover:border-blue-500 ${
                              profile.profile_image?.includes(style)
                                ? "border-blue-600 bg-blue-50 ring-2 ring-blue-400"
                                : "border-slate-200"
                            }`}
                          >
                            <img src={previewUrl} alt={style} className="w-full rounded-md" />
                            <p className="text-xs text-slate-600 mt-1 text-center capitalize">{style}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mb-8 pb-8 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-900 mb-4">Company Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Organization Name</label>
                      <div className="px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-medium">
                        {profile.organisation_name || "Not set"}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Read-only field</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                      <div className="px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-medium">
                        {profile.email || "Not set"}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Read-only field</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter phone number"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                  <button
                    onClick={handleSavePhone}
                    disabled={editProfileMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {editProfileMutation.isPending ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Saving...</>
                    ) : (
                      <><Check className="w-4 h-4" /> Save Phone Number</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {tab === "password" && (
              <div className="p-6 md:p-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-900">Change Password</h2>
                  <p className="text-slate-600 text-sm mt-2">Update your password to keep your account secure</p>
                </div>

                <div className="max-w-md space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Current Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="currentPassword"
                        value={password.currentPassword}
                        onChange={(e) => setPassword((p) => ({ ...p, [e.target.name]: e.target.value }))}
                        placeholder="Enter current password"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">New Password *</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="newPassword"
                      value={password.newPassword}
                      onChange={(e) => setPassword((p) => ({ ...p, [e.target.name]: e.target.value }))}
                      placeholder="Enter new password"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                    <p className="text-xs text-slate-500 mt-1">At least 6 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password *</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="confirm"
                      value={password.confirm}
                      onChange={(e) => setPassword((p) => ({ ...p, [e.target.name]: e.target.value }))}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <button
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending}
                    className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {changePasswordMutation.isPending ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Updating...</>
                    ) : (
                      <><Check className="w-4 h-4" /> Update Password</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {tab === "system" && (
              <div className="p-6 md:p-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-900">System Settings</h2>
                  <p className="text-slate-600 text-sm mt-2">Customize your application preferences</p>
                </div>
                <div className="max-w-md space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Theme</label>
                    <select className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                      <option>Light</option>
                      <option>Dark</option>
                      <option>Auto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Language</label>
                    <select className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                      <option>English</option>
                      <option>Hindi</option>
                    </select>
                  </div>
                  <button className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" /> Save Settings
                  </button>
                </div>
              </div>
            )}
          </div>
          <p className="text-sm text-slate-600 mt-4 text-center">Your changes are automatically backed up</p>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;