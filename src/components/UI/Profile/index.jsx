"use client";
import React, { useState, useEffect } from "react";
import { User, Mail, Lock, Eye, EyeOff, Settings, Shield } from "lucide-react";
import supabase from "@/app/utils/db";
import bcryptjs from "bcryptjs";
import toast from "react-hot-toast";

const Profile = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [originalData, setOriginalData] = useState({
    name: "",
    email: "",
    hashedPassword: "",
  });

  const fetchUser = async () => {
    try {
      const { data, error } = await supabase.from("users").select("*");
      if (error) throw error;

      if (data && data.length > 0) {
        const userData = data[0]; // Assuming we're getting the current user
        const userInfo = {
          id: userData.id_user,
          name: userData.nama,
          email: userData.email,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        };

        setFormData(userInfo);
        setOriginalData({
          name: userData.nama,
          email: userData.email,
          hashedPassword: userData.password,
        });
      }
    } catch (error) {
      console.error("Error fetching data: ", error);
      toast.error("Error fetching data: " + error.message);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const validateForm = () => {
    // Check if basic info has changed
    const basicInfoChanged =
      formData.name !== originalData.name ||
      formData.email !== originalData.email;

    // Check if password fields are filled
    const passwordFieldsFilled =
      formData.currentPassword ||
      formData.newPassword ||
      formData.confirmPassword;

    // If no changes made
    if (!basicInfoChanged && !passwordFieldsFilled) {
      toast.error("No changes have been made");
      return false;
    }

    // If password fields are partially filled
    if (passwordFieldsFilled) {
      if (!formData.currentPassword) {
        toast.error("Current password is required");
        return false;
      }
      if (!formData.newPassword) {
        toast.error("New password is required");
        return false;
      }
      if (!formData.confirmPassword) {
        toast.error("Password confirmation is required");
        return false;
      }
      if (formData.newPassword.length < 8) {
        toast.error("New password must be at least 8 characters");
        return false;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        toast.error("New password and confirmation do not match");
        return false;
      }
    }

    // Email validation
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      toast.error("Invalid email format");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      let updateData = {};
      let needsUpdate = false;

      // Check if basic info changed
      if (formData.name !== originalData.name) {
        updateData.nama = formData.name.trim();
        needsUpdate = true;
      }

      if (formData.email !== originalData.email) {
        // Check if email already exists (optional)
        const { data: existingUser, error: emailCheckError } = await supabase
          .from("users")
          .select("id_user")
          .eq("email", formData.email)
          .neq("id_user", formData.id);

        if (emailCheckError) throw emailCheckError;

        if (existingUser && existingUser.length > 0) {
          toast.error("Email is already in use by another user");
          return;
        }

        updateData.email = formData.email.trim();
        needsUpdate = true;
      }

      // Handle password change
      if (formData.currentPassword && formData.newPassword) {
        // Verify current password
        const isCurrentPasswordValid = await bcryptjs.compare(
          formData.currentPassword,
          originalData.hashedPassword
        );

        if (!isCurrentPasswordValid) {
          toast.error("Current password is incorrect");
          return;
        }

        // Hash new password
        const saltRounds = 12;
        const hashedNewPassword = await bcryptjs.hash(
          formData.newPassword,
          saltRounds
        );
        updateData.password = hashedNewPassword;
        needsUpdate = true;
      }

      if (needsUpdate) {
        // Update user data
        const { error: updateError } = await supabase
          .from("users")
          .update(updateData)
          .eq("id_user", formData.id);

        if (updateError) throw updateError;

        // Update original data state
        setOriginalData((prev) => ({
          ...prev,
          name: updateData.nama || prev.name,
          email: updateData.email || prev.email,
          hashedPassword: updateData.password || prev.hashedPassword,
        }));

        // Clear password fields
        setFormData((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));

        toast.success("Profile updated successfully");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(
        error.message || "An error occurred while updating the profile"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isPasswordValid = formData.newPassword.length >= 8;
  const doPasswordsMatch = formData.newPassword === formData.confirmPassword;

  const tabs = [
    { id: "profile", label: "General", icon: Settings },
    { id: "password", label: "Security", icon: Shield },
  ];

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100">
          <h1 className="text-2xl font-semibold text-gray-900">
            Account Settings
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your profile information and security settings
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-100">
          <nav className="flex px-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 text-md font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="px-8 py-8">
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-6">
                  Profile Information
                </h3>

                {/* Full Name */}
                <div className="mb-6">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-3"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name || ""}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="mb-8">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-3"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email || ""}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors"
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                >
                  {isLoading ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "password" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-6">
                  Change Password
                </h3>

                {/* Current Password */}
                <div className="mb-6">
                  <label
                    htmlFor="currentPassword"
                    className="block text-sm font-medium text-gray-700 mb-3"
                  >
                    Current Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPasswords.current ? "text" : "password"}
                      id="currentPassword"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors"
                      placeholder="Enter your current password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("current")}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPasswords.current ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="mb-6">
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-medium text-gray-700 mb-3"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPasswords.new ? "text" : "password"}
                      id="newPassword"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors"
                      placeholder="Enter your new password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("new")}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPasswords.new ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {formData.newPassword && !isPasswordValid && (
                    <p className="text-xs text-red-600 mt-2">
                      Password must be at least 8 characters
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="mb-8">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 mb-3"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPasswords.confirm ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors"
                      placeholder="Confirm your new password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("confirm")}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {formData.confirmPassword && !doPasswordsMatch && (
                    <p className="text-xs text-red-600 mt-2">
                      Passwords do not match
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                >
                  {isLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
