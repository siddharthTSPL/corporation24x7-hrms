import { useState, useEffect } from "react";
import React from "react";
import { useGetMeAdmin, useEditAdminProfile, useChangeAdminPassword } from "../../auth/server-state/adminauth/adminauth.hook";
import { AlertCircle, Check, Eye, EyeOff } from "lucide-react";

 function SettingsPage() {
  const [tab, setTab] = useState("profile");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });


  const { data: adminData, isLoading, isError } = useGetMeAdmin();
  const editProfileMutation = useEditAdminProfile();
  const changePasswordMutation = useChangeAdminPassword();

  const avatarStyles = [
    "avataaars",     
    "bottts",         
    "personas",       
    "lorelei",       
    "micah",          
    "open-peeps",     
    "big-ears",       
    "croodles",       
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

  const handlePhoneChange = (e) => {
    setProfile((prev) => ({ ...prev, phone: e.target.value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPassword((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarSelect = async (style) => {
    const initials = profile.organisation_name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const avatarUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${
      initials || "default"
    }`;

   
    setProfile((prev) => ({ ...prev, profile_image: avatarUrl }));

   
    try {
      await editProfileMutation.mutateAsync({
        phone: profile.phone,
        profile_image: avatarUrl,
      });
      showMessage("success", "Avatar updated successfully!");
    } catch (error) {
      showMessage("error", error.message || "Failed to update avatar");
    }
  };

  const handleSavePhone = async () => {
    if (!profile.phone) {
      showMessage("error", "Phone number is required");
      return;
    }

    try {
      await editProfileMutation.mutateAsync({
        phone: profile.phone,
        profile_image: profile.profile_image,
      });
      showMessage("success", "Phone number updated successfully!");
    } catch (error) {
      showMessage("error", error.message || "Failed to update phone");
    }
  };

  const handleRemoveAvatar = async () => {
    setProfile((prev) => ({ ...prev, profile_image: "" }));

    try {
      await editProfileMutation.mutateAsync({
        phone: profile.phone,
        profile_image: "",
      });
      showMessage("success", "Avatar removed successfully!");
    } catch (error) {
      showMessage("error", error.message || "Failed to remove avatar");
    }
  };

  const handleChangePassword = async () => {
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

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      setPassword({ currentPassword: "", newPassword: "", confirm: "" });
      showMessage("success", "Password changed successfully");
    } catch (error) {
      showMessage("error", error.message || "Failed to change password");
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error Loading Settings</h3>
              <p className="text-red-700 text-sm mt-1">Please try refreshing the page</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
   
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-2">Manage your profile and account preferences</p>
      </div>

     
      {message.text && (
        <div
          className={`fixed top-4 right-4 rounded-lg shadow-lg p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 z-50 ${
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
          <p
            className={`text-sm font-medium ${
              message.type === "success" ? "text-emerald-900" : "text-red-900"
            }`}
          >
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
                    tab === item.key
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-700 hover:bg-slate-100"
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
                  <p className="text-slate-600 text-sm mt-2">Manage your professional avatar and contact information</p>
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
                      <div className="w-32 h-32 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-4xl font-bold shadow-md">
                        {profile.organisation_name
                          .split(" ")
                          .map((word) => word[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2) || "?"}
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
                      Choose Professional Avatar Style
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {avatarStyles.map((style) => {
                        const initials = profile.organisation_name
                          .split(" ")
                          .map((word) => word[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2);

                        const previewUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${
                          initials || "default"
                        }`;

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
                            title={style}
                          >
                            <img
                              src={previewUrl}
                              alt={style}
                              className="w-full rounded-md"
                            />
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
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Organization Name
                      </label>
                      <div className="px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-medium">
                        {profile.organisation_name || "Not set"}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Read-only field</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email Address
                      </label>
                      <div className="px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-medium">
                        {profile.email || "Not set"}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Read-only field</p>
                    </div>
                  </div>
                </div>

                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={handlePhoneChange}
                      placeholder="Enter phone number"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>

                  <button
                    onClick={handleSavePhone}
                    disabled={editProfileMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    {editProfileMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Save Phone Number
                      </>
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Current Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="currentPassword"
                        value={password.currentPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter current password"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      New Password *
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="newPassword"
                      value={password.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter new password"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                    <p className="text-xs text-slate-500 mt-1">At least 6 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Confirm Password *
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="confirm"
                      value={password.confirm}
                      onChange={handlePasswordChange}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>

                  <button
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending}
                    className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Update Password
                      </>
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Theme
                    </label>
                    <select className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
                      <option>Light</option>
                      <option>Dark</option>
                      <option>Auto</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Language
                    </label>
                    <select className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
                      <option>English</option>
                      <option>Hindi</option>
                    </select>
                  </div>

                  <button className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    Save Settings
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="text-sm text-slate-600 mt-4 text-center">
            Your changes are automatically backed up
          </p>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;