"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [view, setView] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.toLowerCase().startsWith("admin")) {
      router.push("/admin");
    } else {
      router.push("/patient");
    }
  };

  return (
    <div className="flex h-screen w-full bg-white font-sans overflow-hidden">
      {/* Left Panel — Full-bleed Image */}
      <div className="hidden md:block relative w-1/2" style={{ backgroundColor: "#f5f0e8" }}>
        <Image
          src="/login-logo.jpg"
          alt="Healthcare Login"
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* Right Panel — Form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-sm">

          {view === "login" ? (
            <>
              <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">Health Connect </h1>
              <p className="text-sm text-center text-gray-500 mb-8">Book appointments for your next visit.</p>

              <form className="flex flex-col gap-4" onSubmit={handleLogin}>
                {/* Email */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me + Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={() => setRememberMe(!rememberMe)}
                      className="w-4 h-4 rounded border-gray-300 text-[#000000]-600 focus:ring-[#000000]-500"
                    />
                    Remember for 30 days
                  </label><button
                    type="button"
                    className="text-sm font-medium text-[#000000] hover:text-[#222222]"
                  >
                    Forgot password
                  </button>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#000000] hover:bg-[#181818]-700 active:bg-blue-800 text-white text-sm font-semibold rounded-lg transition shadow-sm mt-1"
                >
                  Sign in
                </button>

                {/* Google Sign In */}
                <button
                  type="button"
                  className="w-full py-2.5 flex items-center justify-center gap-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign in with Google
                </button>
              </form>

              <p className="text-sm text-center text-gray-500 mt-6">
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => setView("signup")}
                  className="font-semibold text-[#181818] hover:text-[#000000]"
                >
                  Sign up
                </button>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">Create an account</h1>
              <p className="text-sm text-center text-gray-500 mb-8">Start your 30-day free trial.</p>

              <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
                {/* Name */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Name<span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="signup-email" className="text-sm font-medium text-gray-700">
                    Email<span className="text-red-500">*</span>
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="signup-password" className="text-sm font-medium text-gray-700">
                    Password<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">Must be at least 8 characters.</p>
                </div>

                {/* Get Started Button */}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#000000] hover:bg-[#181818] active:bg-[#000000] text-white text-sm font-semibold rounded-lg transition shadow-sm mt-1"
                >
                  Get started
                </button>

                {/* Google Sign Up */}
                <button
                  type="button"
                  className="w-full py-2.5 flex items-center justify-center gap-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign up with Google
                </button>
              </form>

              <p className="text-sm text-center text-gray-500 mt-6">
                Already have an account?{" "}
                <button
                  onClick={() => setView("login")}
                  className="font-semibold text-[#000000] hover:text-[#181818]"
                >
                  Log in
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
