import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { FiLock } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

const SignupPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      console.log('Attempting signup with:', { name, email });
      await register(name, email, password);
      
      console.log('Signup successful');
      navigate("/");
    } catch (err) {
      console.error('Signup error:', err.response?.data || err);
      setError(err.response?.data?.error || err.response?.data?.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Left Section */}
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

      {/* Right Section */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-white md:h-full p-6">
        <div className="neo-card w-full max-w-[400px] p-8">
          <h3 className="text-2xl font-bold text-center mb-6">Create an Account</h3>
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm text-center font-medium animate-fade-in">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSignup}>
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="neo-input w-full py-3 px-3 placeholder-gray-500"
            />
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
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="neo-input w-full py-3 px-3 pr-8 placeholder-gray-500"
              />
              <FiLock className="absolute right-0 bottom-2 text-gray-400" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="neo-btn w-full bg-black text-white py-3 mt-4 text-sm disabled:opacity-50"
            >
              {loading ? "Signing up..." : "Sign up"}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Already have an Account?{" "}
            <Link to="/login" className="text-blue-500 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
