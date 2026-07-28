import React from "react";
import { FcGoogle } from "react-icons/fc";

const SocialLoginButtons = () => {
  return (
    <div className="flex mb-6 space-x-3 flex-col items-center">
      <p className="text-sm font-medium text-gray-600 mb-4">Sign in with</p>
      <div className="flex space-x-5">
        <a
          href={`${import.meta.env.VITE_API_URL}/auth/google`}
          className="p-3 rounded-full hover:bg-[#e6f3f9] hover:shadow-[0_0_20px_5px_rgba(156,201,222,0.7)] transition duration-300 ease-in-out"
        >
          <FcGoogle className="text-2xl" />
        </a>
      </div>
    </div>
  );
};

export default SocialLoginButtons;