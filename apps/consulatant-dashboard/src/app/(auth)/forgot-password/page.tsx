"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { authService } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email.trim()) {
      setError("Email address is required");
      return;
    }

    setIsLoading(true);

    try {
      await authService.forgotPassword(email.trim());
      setSuccess(true);
    } catch (err) {
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      if (err instanceof ApiError) {
        switch (err.code) {
          case 'USER_NOT_FOUND':
            errorMessage = 'No account found with this email address.';
            break;
          case 'EMAIL_NOT_VERIFIED':
            errorMessage = 'Please verify your email address first.';
            break;
          case 'RATE_LIMIT_EXCEEDED':
            errorMessage = 'Too many requests. Please try again later.';
            break;
          default:
            errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  if (success) {
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

        {/* Main Container - Success State */}
        <div className="w-[443px] bg-white rounded-xl shadow-lg p-[44px_34px] mt-[76px]">
          <div className="flex flex-col items-center gap-[60px]">
            {/* Header Section */}
            <div className="flex flex-col items-center gap-[30px]">
              <div className="p-8">
                <img
                  src="/assets/NakkshaBigLogo.svg"
                  alt="Logo"
                  className="w-[179px] h-[74px] rounded-lg"
                />
              </div>

              <div className="flex flex-col items-center gap-2">
                <h1 className="text-xl font-medium text-black font-poppins">
                  Check your email
                </h1>
                <p className="text-sm text-[var(--black-30)] font-inter text-center">
                  We've sent a password reset link to {email}
                </p>
              </div>
            </div>

            {/* Success Content */}
            <div className="flex flex-col items-center gap-12 w-full">
              {/* Success Message */}
              <div className="w-full p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <CheckCircle size={20} className="text-green-600" />
                <div className="flex-1">
                  <p className="text-green-800 font-medium">Reset email sent!</p>
                  <p className="text-green-600 text-sm">
                    Check your inbox and click the reset link to create a new password.
                  </p>
                </div>
              </div>

              {/* Back to Login */}
              <div className="flex flex-col items-center gap-6 w-full">
                <Button
                  onClick={() => router.push('/login')}
                  className="w-[200px] h-[54px] bg-[var(--primary-100)] hover:bg-[var(--primary-100)]/90 text-white text-xl font-inter rounded-xl"
                >
                  Back to Login
                </Button>

                <p className="text-sm font-inter text-center">
                  <span className="text-[var(--black-30)]">
                    Didn't receive the email?{" "}
                  </span>
                  <button
                    onClick={() => setSuccess(false)}
                    className="text-[var(--primary-100)] hover:underline"
                  >
                    Try again
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

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
            {/* Back Button */}
            <div className="w-full flex justify-start">
              <Link
                href="/login"
                className="flex items-center gap-2 text-sm text-[var(--black-60)] hover:text-[var(--primary-100)] font-inter"
              >
                <ArrowLeft size={16} />
                Back to Login
              </Link>
            </div>

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
                Forgot your password?
              </h1>
              <p className="text-sm text-[var(--black-30)] font-inter text-center">
                Enter your email address and we'll send you a link to reset your password
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
              className="flex flex-col items-center gap-8 w-full"
            >
              {/* Email Field */}
              <div className="relative w-full">
                <Mail
                  size={20}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black z-10"
                />
                <Input
                  type="email"
                  name="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={handleInputChange}
                  className="w-full h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg pl-12 pr-4 text-base text-[var(--black-2)] placeholder:text-[var(--black-2)] font-inter focus-visible:ring-1 text-black focus-visible:ring-[var(--primary-100)]"
                  required
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-[220px] h-[54px] bg-[var(--primary-100)] hover:bg-[var(--primary-100)]/90 text-white text-xl font-inter rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>

            {/* Sign Up Link */}
            <p className="text-sm font-inter">
              <span className="text-[var(--black-30)]">
                Don't have an account?{" "}
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