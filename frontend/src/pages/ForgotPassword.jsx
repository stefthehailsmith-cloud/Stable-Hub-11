import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api, errMsg } from "@/lib/api";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) { toast.error(errMsg(err)); }
    finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="paper-card p-8 w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#4a2410] text-[#D4A373] flex items-center justify-center font-serif-display text-xl">H</div>
          <span className="font-serif-display text-lg">Horse Yard</span>
        </Link>
        <h1 className="font-serif-display text-3xl text-[#2a1106]">Forgot password</h1>
        {sent ? (
          <p data-testid="forgot-sent" className="mt-4 text-stone-700">If that email is registered, a reset link has been sent. Check your inbox.</p>
        ) : (
          <form onSubmit={submit} className="mt-6">
            <label className="overline">Email</label>
            <input data-testid="forgot-email" required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="input mb-4 mt-1" />
            <button data-testid="forgot-submit" disabled={loading} className="btn-primary w-full">{loading ? "Sending…" : "Send reset link"}</button>
          </form>
        )}
        <div className="mt-6 text-sm"><Link to="/login" className="link-brown">Back to sign in</Link></div>
      </div>
    </div>
  );
}
