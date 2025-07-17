// apps/consulatant-dashboard/src/app/(auth)/login/page.tsx

"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Eye, EyeOff, BarChart3, AlertCircle } from "lucide-react";
import { useAuth } from "@/app/providers";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, error, clearError, user, isAuthenticated } = useAuth();
  const router = useRouter();

  // Handle redirect after successful login
  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect based on profile completion status
      if (!user.profileCompleted) {
        router.push('/dashboard/settings');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (!formData.email.trim() || !formData.password.trim()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      await login(formData.email.trim(), formData.password);
      
      // The user will be updated in auth state after successful login
      // We'll handle redirect in useEffect when user state changes
    } catch (err) {
      // Error is handled by the auth context
      console.error('Login error:', err);
    } finally {
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
      clearError();
    }
  };

  return (
    <>
      {/* Top Logo */}
      <div className="fixed top-0 left-0 w-full h-[76px] bg-white flex items-center px-[42px]">
      <div className="p-8">
              <img
                src="/assets/NakkshaBigLogo.svg"
                alt="Logo"
                className="w-[179px] h-[74px] rounded-lg"
              />
            </div>
      </div>

      {/* Main Container */}
      <div className="w-[443px] bg-white rounded-xl shadow-lg p-[44px_34px] mt-[76px]">
        <div className="flex flex-col items-center gap-[60px]">
          {/* Header Section */}
          <div className="flex flex-col items-center gap-[30px]">
            {/* Icon */}
            <div className="p-8">
              <img
                src="/assets/NakkshaBigLogo.svg"
                alt="Logo"
                className="w-[179px] h-[74px] rounded-lg"
              />
            </div>

            {/* Intro Content */}
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-xl font-medium text-black font-poppins">
                Welcome back!
              </h1>
              <p className="text-sm text-[var(--black-30)] font-inter">
                Login to your account
              </p>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex flex-col items-center gap-12 w-full">
            {/* Error Message */}
            {error && (
              <div className="w-full p-4 bg-red-50 border border-red-200 text-black rounded-lg flex items-center gap-3">
                <AlertCircle size={20} className="text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="flex flex-col items-center gap-3 w-full"
            >
              {/* Input Fields */}
              <div className="flex flex-col items-start gap-[30px] w-full">
                {/* Email Field */}
                <div className="relative w-full">
                  <Mail
                    size={20}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black z-10"
                  />
                  <Input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg pl-12 pr-4 text-base text-[var(--black-2)] placeholder:text-[var(--black-2)] font-inter focus-visible:ring-1 text-black focus-visible:ring-[var(--primary-100)]"
                    required
                  />
                </div>

                {/* Password Field */}
                <div className="relative w-full">
                  <Lock
                    size={20}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black z-10"
                  />
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg pl-12 pr-12 text-base text-[var(--black-2)] placeholder:text-[var(--black-2)] font-inter focus-visible:ring-1 text-black focus-visible:ring-[var(--primary-100)]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-black hover:text-gray-600 z-10"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Recover Password Link */}
              <div className="w-full flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm text-[var(--primary-100)] font-inter hover:underline"
                >
                  Recover Password
                </Link>
              </div>

              {/* Login Button - MOVED INSIDE FORM */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-[180px] h-[54px] bg-[var(--primary-100)] hover:bg-[var(--primary-100)]/90 text-white text-xl font-inter rounded-xl disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>

            {/* Sign Up Link */}
            <p className="text-sm font-inter">
              <span className="text-[var(--black-30)]">
                Don&apos;t have an account?{" "}
              </span>
              <Link
                href="/signup"
                className="text-[var(--primary-100)] hover:underline"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
