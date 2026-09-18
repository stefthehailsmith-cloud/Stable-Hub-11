import React from "react";
import { Link } from "react-router-dom";

export default function PaymentCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="paper-card p-10 max-w-md text-center">
        <h1 className="font-serif-display text-3xl text-[#2a1106]">Payment cancelled</h1>
        <p className="text-stone-500 mt-2">No charge was made. You can try again anytime.</p>
        <Link to="/billing" className="btn-primary inline-block mt-6">Back to billing</Link>
      </div>
    </div>
  );
}
