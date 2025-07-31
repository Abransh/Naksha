"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Eye, EyeOff, User, BarChart3, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "@/app/providers";

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const { signup, error, clearError } = useAuth();
  const router = useRouter();

  // Handle redirect after successful signup
  useEffect(() => {
    if (success) {
      // Start countdown and redirect to login
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            router.push('/login');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Cleanup on unmount
      return () => clearInterval(countdownInterval);
    }
  }, [success, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    clearError();

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password.trim()) {
      return;
    }

    setIsLoading(true);

    try {
      await signup(formData.fullName.trim(), formData.email.trim(), formData.password);
      setSuccess(true);
      setIsLoading(false);
      // Success state will trigger redirect countdown
    } catch (err) {
      // Error is handled by the auth context
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
        

            {/* Company Logo Placeholder */}
            <div className="p-8">
              <img
                src="/assets/NakkshaBigLogo.svg"
                alt="Logo"
                className="w-[179px] h-[74px] rounded-lg"
              />
            </div>

            {/* Intro Content */}
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-xl font-medium text-center font-poppins">
                <span className="text-black">Get Started with </span>
                <span className="text-[#F2AE31]">Nakksha</span>
              </h1>
              <p className="text-sm text-[var(--black-30)] font-inter text-center">
                Create your 7 days free trial account
              </p>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex flex-col items-center gap-12 w-full">
            {/* Success Message */}
            {success && (
              <div className="w-full p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <CheckCircle size={20} className="text-green-600" />
                <div className="flex-1">
                  <p className="text-green-800 font-medium">Account created successfully!</p>
                  <p className="text-green-600 text-sm">
                    Please check your email to verify your account. 
                    Redirecting to login in {countdown} second{countdown !== 1 ? 's' : ''}...
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && !success && (
              <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <AlertCircle size={20} className="text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="flex flex-col items-center gap-3 w-full"
              noValidate
            >
              {/* Input Fields */}
              <div className="flex flex-col items-start gap-[30px] w-full">
                {/* Full Name Field */}
                <div className="relative w-full">
                  <User
                    size={20}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black z-10"
                  />
                  <Input
                    type="text"
                    name="fullName"
                    placeholder="Your Full Name"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg pl-12 pr-4 text-base text-[var(--black-2)] placeholder:text-[var(--black-2)] font-inter focus-visible:ring-1 focus-visible:ring-[var(--primary-100)]"
                    required
                  />
                </div>

                {/* Email Field */}
                <div className="relative w-full">
                  <Mail
                    size={20}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black z-10"
                  />
                  <Input
                    type="email"
                    name="email"
                    placeholder="Your Email Address"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full h-[52px] bg-[var(--input-defaultBackground)] text-black border-0 rounded-lg pl-12 pr-4 text-base text-[var(--black-2)] placeholder:text-[var(--black-2)] font-inter focus-visible:ring-1 focus-visible:ring-[var(--primary-100)]"
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
                    placeholder="Create a Strong Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg pl-12 pr-12 text-base text-black text-[var(--black-2)] placeholder:text-[var(--black-2)] font-inter focus-visible:ring-1 focus-visible:ring-[var(--primary-100)]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-black  z-10"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Sign-up Button - MOVED INSIDE FORM */}
              <Button
                type="submit"
                disabled={isLoading || success}
                className="w-[180px] h-[54px] bg-[var(--primary-100)] hover:bg-[var(--primary-100)]/90 text-white text-xl font-inter rounded-xl disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {isLoading ? "Creating..." : success ? "Created!" : "Sign-up"}
              </Button>
            </form>

            {/* Login Link */}
            <p className="text-sm font-inter">
              <span className="text-[var(--black-30)]">
                Already have an account?{" "}
              </span>
              <Link
                href="/login"
                className="text-[var(--primary-100)] hover:underline"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
