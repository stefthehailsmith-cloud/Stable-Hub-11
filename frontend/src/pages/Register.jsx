import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Register() {
  const { register, errMsg } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "manager" });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await register(form);
      toast.success(`Welcome, ${u.name}`);
      nav(u.role === "owner" ? "/owner-portal" : "/dashboard");
    } catch (err) { toast.error(errMsg(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="flex items-center justify-center p-8 order-2 lg:order-1">
        <form onSubmit={submit} className="w-full max-w-sm">
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg bg-[#4a2410] text-[#D4A373] flex items-center justify-center font-serif-display text-xl">H</div>
            <span className="font-serif-display text-lg">Stable Hub</span>
          </Link>
          <h1 className="font-serif-display text-3xl text-[#2a1106]">Open your yard book</h1>
          <p className="text-stone-500 mt-2 mb-8">Start free — pay only when you have horses to bill.</p>

          <label className="overline">Your name</label>
          <input data-testid="reg-name" required value={form.name} onChange={set("name")} className="input mb-4 mt-1" />
          <label className="overline">Email</label>
          <input data-testid="reg-email" required type="email" value={form.email} onChange={set("email")} className="input mb-4 mt-1" />
          <label className="overline">Password</label>
          <input data-testid="reg-password" required minLength={6} type="password" value={form.password} onChange={set("password")} className="input mb-4 mt-1" />

          <label className="overline">I am a</label>
          <div className="grid grid-cols-2 gap-2 mt-1 mb-6">
            {[{v:"manager",l:"Yard Manager"},{v:"owner",l:"Horse Owner"}].map(o => (
              <button type="button" key={o.v} data-testid={`reg-role-${o.v}`} onClick={()=>setForm({...form, role:o.v})} className={`p-3 rounded-lg border text-sm font-medium transition ${form.role===o.v ? "border-[#4a2410] bg-[#4a2410] text-[#FAF7F2]" : "border-[#E5DEC9] text-stone-700 hover:bg-[#F3EDE2]"}`}>{o.l}</button>
            ))}
          </div>

          <button data-testid="reg-submit" disabled={loading} className="btn-primary w-full">{loading ? "Creating…" : "Create account"}</button>
          <p className="mt-6 text-sm text-stone-500 text-center">
            Already have one? <Link to="/login" className="link-brown">Sign in</Link>
          </p>
        </form>
      </div>
      <div className="hidden lg:block relative order-1 lg:order-2">
        <img src="https://images.pexels.com/photos/20145372/pexels-photo-20145372.jpeg?auto=compress&cs=tinysrgb&h=1000" alt="Arabian" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-bl from-[#1b4332]/70 via-transparent to-[#2a1106]/40" />
      </div>
    </div>
  );
}
