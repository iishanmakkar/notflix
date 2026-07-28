import React from "react";
import { supportEmail } from "../config/appConfig";

export default function ShippingAndDelivery() {
  return (
    <div className="neo-policy">
      <h1>DELIVERY POLICY.</h1>
      <p className="mb-4">Notflix is a digital platform. All content and services are delivered electronically.</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">Digital Delivery</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>All notes and resources are available for download immediately after purchase or registration.</li>
        <li>No physical products are shipped.</li>
      </ul>
      <h2 className="text-xl font-semibold mt-6 mb-2">Access Issues</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>If you experience issues accessing your content, please contact our support team.</li>
      </ul>
      <p className="mt-6">For support, email <a href={`mailto:${supportEmail}`} className="text-blue-600 underline">{supportEmail}</a>.</p>
    </div>
  );
} 
