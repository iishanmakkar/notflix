import React from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const PaymentForm = ({ onSuccess }) => {
  const { user, api } = useAuth();

  const handlePayment = async () => {
    const res = await loadRazorpayScript();
    if (!res) {
      toast.error("Failed to load Razorpay. Please try again.");
      return;
    }

    let order;
    try {
      order = (await api.post('/api/payment/orders')).data;
    } catch (error) {
      toast.error(error.response?.data?.error || "Unable to start payment. Please try again later.");
      return;
    }

    const options = {
      key: order.key,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "Notflix Premium Upgrade",
      description: "Lifetime Premium Access",
      image: "/faviconNotflix.png",
      handler: async function (response) {
        try {
          await api.post('/api/payment/verify', response);
          if (onSuccess) {
            toast.success("You are now a premium user!");
            onSuccess();
          } else {
            toast.success("You are now a premium user!");
          }
        } catch (error) {
          toast.error(error.response?.data?.error || "Upgrade failed. Please try again.");
        }
      },
      prefill: {
        name: user?.name || "",
        email: user?.email || "",
      },
      theme: {
        color: "#3399cc",
      },
      modal: {
        ondismiss: function () {
          toast("Payment cancelled.");
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <button
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded shadow"
        onClick={handlePayment}
      >
        Pay ₹1 & Upgrade (Test Mode)
      </button>
      <p className="text-xs text-gray-500">You will be redirected to Razorpay's test checkout page.</p>
    </div>
  );
};

export default PaymentForm; 
