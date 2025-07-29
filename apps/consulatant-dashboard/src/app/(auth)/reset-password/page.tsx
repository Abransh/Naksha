"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { authService } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function ResetPasswordPage() {
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tokenValidating, setTokenValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState<{ email: string; firstName: string } | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const validateToken = async () => {
      const tokenParam = searchParams.get('token');
      if (!tokenParam) {
        setError('Invalid or missing reset token. Please request a new password reset link.');
        setTokenValidating(false);
        return;
      }

      setToken(tokenParam);
      
      try {
        console.log('🔍 Validating reset token...');
        const validation = await authService.validateResetToken(tokenParam);
        
        if (validation.valid) {
          setTokenValid(true);
          setUserInfo(validation.data || null);
          console.log('✅ Token is valid:', validation.data);
        } else {
          setError('Invalid or expired reset token. Please request a new password reset link.');
        }
      } catch (err) {
        console.error('❌ Token validation failed:', err);
        if (err instanceof ApiError) {
          switch (err.code) {
            case 'INVALID_RESET_TOKEN':
              setError('Invalid or expired reset token. Please request a new password reset link.');
              break;
            case 'ACCOUNT_NOT_FOUND':
              setError('The associated account no longer exists. Please contact support.');
              break;
            default:
              setError('Failed to validate reset token. Please try again or request a new reset link.');
          }
        } else {
          setError('Failed to validate reset token. Please try again or request a new reset link.');
        }
      } finally {
        setTokenValidating(false);
      }
    };

    validateToken();
  }, [searchParams]);

  const validatePasswords = () => {
    const password = formData.password;
    
    // Check minimum length
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return false;
    }
    
    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter.');
      return false;
    }
    
    // Check for lowercase letter
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter.');
      return false;
    }
    
    // Check for number
    if (!/\d/.test(password)) {
      setError('Password must contain at least one number.');
      return false;
    }
    
    // Check for special character
    if (!/[@$!%*?&]/.test(password)) {
      setError('Password must contain at least one special character (@$!%*?&).');
      return false;
    }
    
    // Check if passwords match
    if (password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!token) {
      setError('Invalid reset token. Please request a new password reset link.');
      return;
    }

    if (!validatePasswords()) {
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword(token, formData.password);
      setSuccess(true);
    } catch (err) {
      let errorMessage = 'Failed to reset password. Please try again.';
      
      if (err instanceof ApiError) {
        switch (err.code) {
          case 'INVALID_TOKEN':
            errorMessage = 'Invalid or expired reset token. Please request a new password reset link.';
            break;
          case 'TOKEN_EXPIRED':
            errorMessage = 'Reset link has expired. Please request a new password reset link.';
            break;
          case 'VALIDATION_ERROR':
            errorMessage = 'Password does not meet security requirements.';
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
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
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
                  Password reset successful!
                </h1>
                <p className="text-sm text-[var(--black-30)] font-inter text-center">
                  Your password has been successfully updated
                </p>
              </div>
            </div>

            {/* Success Content */}
            <div className="flex flex-col items-center gap-12 w-full">
              {/* Success Message */}
              <div className="w-full p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <CheckCircle size={20} className="text-green-600" />
                <div className="flex-1">
                  <p className="text-green-800 font-medium">Password updated!</p>
                  <p className="text-green-600 text-sm">
                    You can now log in with your new password.
                  </p>
                </div>
              </div>

              {/* Continue to Login */}
              <Button
                onClick={() => router.push('/login')}
                className="w-[180px] h-[54px] bg-[var(--primary-100)] hover:bg-[var(--primary-100)]/90 text-white text-xl font-inter rounded-xl"
              >
                Continue to Login
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Show loading state while validating token
  if (tokenValidating) {
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

        {/* Main Container - Loading State */}
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
                  Validating reset link
                </h1>
                <p className="text-sm text-[var(--black-30)] font-inter text-center">
                  Please wait while we verify your password reset token...
                </p>
              </div>
            </div>

            {/* Loading Content */}
            <div className="flex flex-col items-center gap-12 w-full">
              <div className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <p className="text-blue-800">Validating your reset link...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Show error state if token is invalid
  if (!tokenValid) {
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

        {/* Main Container - Error State */}
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
                  Invalid reset link
                </h1>
                <p className="text-sm text-[var(--black-30)] font-inter text-center">
                  This password reset link is invalid or has expired
                </p>
              </div>
            </div>

            {/* Error Content */}
            <div className="flex flex-col items-center gap-12 w-full">
              {/* Error Message */}
              <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <AlertCircle size={20} className="text-red-600" />
                <div className="flex-1">
                  <p className="text-red-800 font-medium">Reset link expired</p>
                  <p className="text-red-600 text-sm">
                    {error || 'Please request a new password reset link.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-4 w-full">
                <Link
                  href="/forgot-password"
                  className="w-full h-[54px] bg-[var(--primary-100)] hover:bg-[var(--primary-100)]/90 text-white text-xl font-inter rounded-xl flex items-center justify-center"
                >
                  Request New Reset Link
                </Link>
                
                <Link
                  href="/login"
                  className="w-full h-[54px] border border-[var(--primary-100)] text-[var(--primary-100)] hover:bg-[var(--primary-100)]/10 text-xl font-inter rounded-xl flex items-center justify-center"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Show the password reset form only if token is valid
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
                Reset your password
              </h1>
              <p className="text-sm text-[var(--black-30)] font-inter text-center">
                {userInfo ? `Hi ${userInfo.firstName}, enter your new password below` : 'Enter your new password below'}
              </p>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex flex-col items-center gap-12 w-full">
            {/* Success Message for Valid Token */}
            {userInfo && (
              <div className="w-full p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <CheckCircle size={20} className="text-green-600" />
                <div className="flex-1">
                  <p className="text-green-800 font-medium">Reset link verified</p>
                  <p className="text-green-600 text-sm">
                    You can now create a new password for {userInfo.email}
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="w-full p-4 bg-red-50 border border-red-200 text-black rounded-lg flex items-center gap-3">
                <AlertCircle size={20} className="text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="flex flex-col items-center gap-6 w-full"
            >
              {/* Input Fields */}
              <div className="flex flex-col items-start gap-[30px] w-full">
                {/* New Password Field */}
                <div className="relative w-full">
                  <Lock
                    size={20}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black z-10"
                  />
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="New Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg pl-12 pr-12 text-base text-[var(--black-2)] placeholder:text-[var(--black-2)] font-inter focus-visible:ring-1 text-black focus-visible:ring-[var(--primary-100)]"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-black hover:text-gray-600 z-10"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Confirm Password Field */}
                <div className="relative w-full">
                  <Lock
                    size={20}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black z-10"
                  />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Confirm New Password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg pl-12 pr-12 text-base text-[var(--black-2)] placeholder:text-[var(--black-2)] font-inter focus-visible:ring-1 text-black focus-visible:ring-[var(--primary-100)]"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-black hover:text-gray-600 z-10"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="w-full bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-[var(--black-60)] font-inter mb-2">Password requirements:</p>
                <ul className="text-xs text-[var(--black-60)] font-inter list-disc list-inside space-y-1">
                  <li className={formData.password.length >= 8 ? 'text-green-600' : ''}>
                    At least 8 characters long
                  </li>
                  <li className={/[A-Z]/.test(formData.password) ? 'text-green-600' : ''}>
                    At least one uppercase letter (A-Z)
                  </li>
                  <li className={/[a-z]/.test(formData.password) ? 'text-green-600' : ''}>
                    At least one lowercase letter (a-z)
                  </li>
                  <li className={/\d/.test(formData.password) ? 'text-green-600' : ''}>
                    At least one number (0-9)
                  </li>
                  <li className={/[@$!%*?&]/.test(formData.password) ? 'text-green-600' : ''}>
                    At least one special character (@$!%*?&)
                  </li>
                  <li className={formData.password && formData.confirmPassword && formData.password === formData.confirmPassword ? 'text-green-600' : ''}>
                    Both passwords must match
                  </li>
                </ul>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || !token}
                className="w-[200px] h-[54px] bg-[var(--primary-100)] hover:bg-[var(--primary-100)]/90 text-white text-xl font-inter rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Updating..." : "Update Password"}
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