import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { trackUserAction } from "../utils/analytics";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Use only the auth context login function
      await login(email, password);
      trackUserAction.login('email'); // Track successful login
      navigate("/");
    } catch (err) {
      console.error("Login error:", err.response?.data || err);
      setError(err.response?.data?.error || err.response?.data?.message || "Invalid credentials or server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Left */}
      <div className="neo-dot-pattern w-full md:w-1/2 relative p-6 md:p-10 md:h-full border-b-2 border-black md:border-b-0 md:border-r-2">
        <div className="flex flex-col items-start">
          <img src="/Notflix-new.png" alt="Notflix Logo" className="h-16 md:h-20 mb-1" />
          <p className="text-black-700 text-lg md:text-xl mt-2 font-medium">Simplify Your Study</p>
        </div>
        <img
          src="/assets/loginpage.png"
          alt="Abstract Design"
          className="absolute top-1/2 left-[75%] transform -translate-x-1/2 -translate-y-1/2 w-10/12 max-w-lg hidden lg:block"
        />
      </div>

      {/* Right */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-white md:h-full p-6">
        <div className="neo-card w-full max-w-[400px] p-8">
          <h3 className="text-2xl font-bold text-center mb-6">Welcome Back!</h3>
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm text-center font-medium animate-fade-in">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="neo-input w-full py-3 px-3 placeholder-gray-500"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="neo-input w-full py-3 px-3 pr-10 placeholder-gray-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 bottom-2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="neo-btn w-full bg-black text-white py-3 mt-4 text-sm disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Don't have an Account?{" "}
            <Link to="/signup" className="text-blue-500 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
