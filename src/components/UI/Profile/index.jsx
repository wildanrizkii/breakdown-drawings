"use client";
import React, { useState, useEffect } from "react";
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import supabase from "@/app/utils/db";
import bcryptjs from "bcryptjs";
import toast from "react-hot-toast";

const Profile = () => {
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

  return (
    <div className="max-w-md">
      <div className="mx-auto">
        <div className="">
          <h1 className="text-xl font-semibold text-gray-900">
            Account Settings
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your profile information
          </p>
        </div>

        <div className="pt-6 space-y-6">
          {/* Full Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Enter your full name"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Enter your email"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              Change Password
            </h3>
          </div>

          {/* Current Password */}
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Current Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPasswords.current ? "text" : "password"}
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Enter your current password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("current")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.current ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPasswords.new ? "text" : "password"}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Enter your new password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("new")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {formData.newPassword && !isPasswordValid && (
              <p className="text-xs text-red-600 mt-1">
                Password must be at least 8 characters
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPasswords.confirm ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Confirm your new password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("confirm")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirm ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {formData.confirmPassword && !doPasswordsMatch && (
              <p className="text-xs text-red-600 mt-1">
                Passwords do not match
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
