import React, { useState } from "react";
import { supportEmail } from "../config/appConfig";

export default function ContactUs() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to send message. Please try again later.");
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="font-display text-5xl mb-6">LET'S TALK.</h1>
      <p className="mb-4">
        Have questions or need support? Email us at
        <span className="text-blue-600"> {supportEmail}</span> or fill out the form below.
      </p>
      {submitted ? (
        <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded mb-6">Thank you for contacting us! We'll get back to you soon.</div>
      ) : (
        <form onSubmit={handleSubmit} className="neo-card space-y-5 p-6">
          <div>
            <label className="block font-medium mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="neo-input w-full px-3 py-3"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="neo-input w-full px-3 py-3"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Message</label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              required
              className="neo-input w-full px-3 py-3 min-h-[100px]"
            />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button type="submit" className="neo-btn bg-black text-white px-6 py-3" disabled={loading}>
            {loading ? "Sending..." : "Send"}
          </button>
        </form>
      )}
    </div>
  );
} 
