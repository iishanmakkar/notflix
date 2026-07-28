import React from "react";
import { supportEmail } from "../config/appConfig";

export default function TermsAndConditions() {
  return (
    <div className="neo-policy">
      <h1>TERMS & CONDITIONS.</h1>
      <p className="mb-4">By using Notflix, you agree to the following terms and conditions. Please read them carefully.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">Use of Service</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>You must provide accurate information during registration.</li>
        <li>You are responsible for the content you upload.</li>
        <li>Do not use the platform for unlawful activities.</li>
      </ul>
      <h2 className="text-xl font-semibold mt-6 mb-2">Intellectual Property</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>All content on Notflix is protected by copyright laws.</li>
        <li>Do not copy or redistribute content without permission.</li>
      </ul>
      <h2 className="text-xl font-semibold mt-6 mb-2">Limitation of Liability</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>Notflix is not liable for any damages resulting from use of the platform.</li>
        <li>We do not guarantee the accuracy of user-uploaded content.</li>
      </ul>
      <p className="mt-6">For any questions, contact us at <a href={`mailto:${supportEmail}`} className="text-blue-600 underline">{supportEmail}</a>.</p>
    </div>
  );
} 
