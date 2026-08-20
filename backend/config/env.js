const requiredInProduction = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "REDIS_URL", "JWT_SECRET", "SESSION_SECRET", "FRONTEND_URL"];

function validateEnvironment() {
  if (process.env.NODE_ENV !== "production") return;

  const missing = requiredInProduction.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }

  if (process.env.JWT_SECRET.length < 32 || process.env.SESSION_SECRET.length < 32) {
    throw new Error("JWT_SECRET and SESSION_SECRET must each be at least 32 characters in production.");
  }

  if ((process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_SECRET)
    && (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured together.");
  }
}

module.exports = { validateEnvironment };
