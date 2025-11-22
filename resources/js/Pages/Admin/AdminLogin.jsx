import React, { useState } from "react";
import { useForm } from "@inertiajs/react";
import { User, Lock } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminLogin() {
  const { data, setData, post, processing, errors } = useForm({
    username: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const togglePassword = () => setShowPassword(!showPassword);

  const submit = (e) => {
    e.preventDefault();
    post(route("admin.login.post"));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col md:flex-row rounded-2xl shadow-2xl overflow-hidden max-w-5xl w-full bg-white"
      >
        {/* Left Side - Logo and School Info */}
        <div className="md:w-1/2 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 flex flex-col items-center justify-center p-10 text-white">
          <img
            src="/images/ANCHS.png"
            alt="School Logo"
            className="w-32 h-32 mb-6 drop-shadow-lg"
          />
          <h1 className="text-3xl md:text-4xl font-extrabold text-center leading-snug">
            Alubijid Comprehensive <br /> National Highschool
          </h1>
          <p className="mt-6 text-blue-100 text-sm md:text-base text-center max-w-xs leading-relaxed">
            Welcome back, Admin! Login to access the dashboard and manage the
            school system.
          </p>
        </div>

        {/* Right Side - Login Form */}
        <div className="md:w-1/2 p-10 flex flex-col justify-center bg-white">
          <h2 className="text-3xl font-extrabold text-gray-800 mb-8 text-center">
            Admin Login
          </h2>

          <form onSubmit={submit} noValidate className="space-y-6">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 text-gray-400" size={20} />
                <input
                  id="username"
                  type="text"
                  value={data.username}
                  onChange={(e) => setData("username", e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition ${errors.username
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                    }`}
                  autoComplete="username"
                  placeholder="Enter your username"
                />
              </div>
              {errors.username && (
                <p className="text-red-600 text-sm mt-1">{errors.username}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-gray-400" size={20} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={data.password}
                  onChange={(e) => setData("password", e.target.value)}
                  className={`w-full pl-10 pr-16 py-3 border rounded-xl focus:outline-none focus:ring-2 transition ${errors.password
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                    }`}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={togglePassword}
                  className="absolute right-3 top-3 text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-600 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={processing}
              className={`w-full py-3 rounded-xl text-white font-semibold text-lg shadow-md transition transform ${processing
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 hover:scale-[1.02]"
                }`}
            >
              {processing ? "Logging in..." : "Login"}
            </button>

          </form>
        </div>
      </motion.div>
    </div>
  );
}
