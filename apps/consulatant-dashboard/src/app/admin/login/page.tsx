"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Eye, EyeOff, AlertCircle, Shield } from "lucide-react";
import { adminApi } from "@/lib/adminApi";

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setError("");
    
    if (!formData.email.trim() || !formData.password.trim()) {
      setError("Please enter both email and password");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Make admin login request
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/auth/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store admin token in localStorage
      localStorage.setItem('adminToken', data.data.tokens.accessToken);
      localStorage.setItem('adminRefreshToken', data.data.tokens.refreshToken);
      localStorage.setItem('adminUser', JSON.stringify(data.data.admin));

      // Redirect to admin dashboard
      router.push('/admin');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Main Container */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center gap-8">
          {/* Header Section */}
          <div className="flex flex-col items-center gap-6">
            {/* Admin Icon */}
            <div className="p-4 bg-blue-100 rounded-full">
              <Shield size={32} className="text-blue-600" />
            </div>

            {/* Intro Content */}
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 font-poppins">
                Admin Login
              </h1>
              <p className="text-sm text-gray-600 font-inter text-center">
                Access the Nakksha admin dashboard
              </p>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex flex-col gap-6 w-full">
            {/* Error Message */}
            {error && (
              <div className="w-full p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center gap-3">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-6 w-full"
              noValidate
            >
              {/* Input Fields */}
              <div className="flex flex-col gap-4 w-full">
                {/* Email Field */}
                <div className="relative w-full">
                  <Mail
                    size={20}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 z-10"
                  />
                  <Input
                    type="email"
                    name="email"
                    placeholder="Admin Email Address"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full h-12 bg-gray-50 border border-gray-200 rounded-lg pl-12 pr-4 text-gray-900 placeholder:text-gray-500 font-inter focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent"
                    required
                  />
                </div>

                {/* Password Field */}
                <div className="relative w-full">
                  <Lock
                    size={20}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 z-10"
                  />
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full h-12 bg-gray-50 border border-gray-200 rounded-lg pl-12 pr-12 text-gray-900 placeholder:text-gray-500 font-inter focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 z-10"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold font-inter rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Logging in...
                  </div>
                ) : (
                  "Login to Admin Dashboard"
                )}
              </Button>
            </form>

            {/* Security Notice */}
            <div className="text-center">
              <p className="text-xs text-gray-500 font-inter">
                This is a secure admin area. All activities are logged.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}