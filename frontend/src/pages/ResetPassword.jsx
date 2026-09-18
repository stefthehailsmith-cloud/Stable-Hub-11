import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, errMsg } from "@/lib/api";
import { toast } from "sonner";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Password updated. Please sign in.");
      nav("/login");
    } catch (err) { toast.error(errMsg(err)); }
    finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="paper-card p-8 w-full max-w-md">
        <h1 className="font-serif-display text-3xl text-[#2a1106]">Set a new password</h1>
        <form onSubmit={submit} className="mt-6">
          <label className="overline">New password</label>
          <input data-testid="reset-password" required minLength={6} type="password" value={password} onChange={e=>setPassword(e.target.value)} className="input mb-4 mt-1" />
          <button data-testid="reset-submit" disabled={loading || !token} className="btn-primary w-full">{loading ? "Updating…" : "Update password"}</button>
        </form>
        <div className="mt-6 text-sm"><Link to="/login" className="link-brown">Back to sign in</Link></div>
      </div>
    </div>
  );
}
