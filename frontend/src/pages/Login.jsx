import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const { login, errMsg } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name}`);
      nav(u.role === "owner" ? "/owner-portal" : "/dashboard");
    } catch (err) {
      toast.error(errMsg(err));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:block relative">
        <img src="https://images.unsplash.com/photo-1746566841253-44181b0a042c?crop=entropy&cs=srgb&fm=jpg&h=1000&w=800" alt="Horse" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#2a1106]/70 via-[#4a2410]/30 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-[#FAF7F2]">
          <div className="overline text-[#D4A373]">Stable Hub Manager</div>
          <h2 className="font-serif-display text-4xl mt-2 leading-tight">Every hoof, every hay bale, every invoice — accounted for.</h2>
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm">
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg bg-[#4a2410] text-[#D4A373] flex items-center justify-center font-serif-display text-xl">H</div>
            <span className="font-serif-display text-lg">Stable Hub</span>
          </Link>
          <h1 className="font-serif-display text-3xl text-[#2a1106]">Welcome back</h1>
          <p className="text-stone-500 mt-2 mb-8">Sign in to manage your yard.</p>
          <label className="overline">Email</label>
          <input data-testid="login-email" required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="input mb-4 mt-1" />
          <label className="overline">Password</label>
          <input data-testid="login-password" required type="password" value={password} onChange={e=>setPassword(e.target.value)} className="input mb-2 mt-1" />
          <div className="text-right mb-6">
            <Link to="/forgot-password" data-testid="login-forgot" className="link-brown text-sm">Forgot password?</Link>
          </div>
          <button data-testid="login-submit" disabled={loading} className="btn-primary w-full">{loading ? "Signing in…" : "Sign in"}</button>
          <p className="mt-6 text-sm text-stone-500 text-center">
            No account yet? <Link to="/register" data-testid="login-to-register" className="link-brown">Create one</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
