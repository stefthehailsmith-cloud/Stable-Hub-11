import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { CheckCircle2 } from "lucide-react";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sid = params.get("session_id");
  const [status, setStatus] = useState(null);
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (!sid) return;
    let done = false;
    const poll = async () => {
      try {
        const { data } = await api.get(`/payments/status/${sid}`);
        setStatus(data);
        if (data.payment_status === "paid" || tries > 15) { done = true; return; }
      } catch (e) { /* ignore */ }
      if (!done) setTimeout(() => setTries(t=>t+1), 2000);
    };
    poll();
  }, [sid, tries]);
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="paper-card p-10 max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-[#52B788]/15 flex items-center justify-center mx-auto"><CheckCircle2 size={32} className="text-[#1b4332]"/></div>
        <h1 className="font-serif-display text-3xl text-[#2a1106] mt-4">Payment received</h1>
        {status ? (
          <p className="text-stone-700 mt-2">Status: <span className="font-mono-nums">{status.payment_status}</span></p>
        ) : (
          <p className="text-stone-500 mt-2">Confirming with Stripe…</p>
        )}
        <Link to="/billing" className="btn-primary inline-block mt-6">Back to billing</Link>
      </div>
    </div>
  );
}
