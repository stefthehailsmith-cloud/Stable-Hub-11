import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const HERO = "https://images.pexels.com/photos/37540627/pexels-photo-37540627.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function Landing() {
  const [horses, setHorses] = useState(15);
  const monthly = (horses * 4).toFixed(2);
  return (
    <div className="min-h-screen">
      <nav className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#4a2410] text-[#D4A373] flex items-center justify-center font-serif-display text-xl">H</div>
          <div>
            <div className="font-serif-display text-lg leading-tight">Horse Yard</div>
            <div className="overline text-[10px]">Manager</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" data-testid="nav-login" className="btn-ghost">Sign in</Link>
          <Link to="/register" data-testid="nav-register" className="btn-primary">Get started</Link>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 pt-8 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-6 flex flex-col justify-center">
          <div className="overline mb-4">EST. 2026 · YARD MANAGEMENT</div>
          <h1 className="font-serif-display text-4xl sm:text-5xl lg:text-6xl leading-[1.05] text-[#2a1106]">
            The quiet ledger for<br />a well-run yard.
          </h1>
          <p className="mt-6 text-stone-700 max-w-lg text-lg leading-relaxed">
            One book for vaccinations, farrier, dental, physio, feed, expenses, competitions, passports, leases and owner billing. Priced simply — <span className="font-mono-nums text-[#8c4921]">R4/horse/month</span>.
          </p>
          <div className="mt-8 paper-card p-6 max-w-md">
            <div className="overline mb-3">Yard size calculator</div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-stone-500 text-sm">Number of horses</span>
              <span className="font-mono-nums text-3xl text-[#4a2410]" data-testid="calc-horses">{horses}</span>
            </div>
            <input
              type="range" min="1" max="80" value={horses}
              onChange={(e) => setHorses(parseInt(e.target.value))}
              data-testid="calc-slider"
              className="w-full accent-[#8c4921]"
            />
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-stone-500 text-sm">Estimated monthly</span>
              <span className="font-mono-nums text-2xl text-[#1b4332]" data-testid="calc-monthly">R {monthly}</span>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" data-testid="hero-get-started" className="btn-primary inline-flex items-center gap-2">Start your yard <ArrowRight size={16} /></Link>
            <Link to="/login" className="btn-ghost">I have an account</Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 max-w-md">
            {["Vaccinations & farrier","Dental & physio","Feed plans","Expense ledger","Passports & leases","Owner statements"].map(f => (
              <div key={f} className="flex items-start gap-2 text-sm text-stone-700"><CheckCircle2 size={16} className="text-[#2d6a4f] mt-0.5" />{f}</div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-6 relative">
          <div className="paper-card overflow-hidden">
            <img src={HERO} alt="Stable" className="w-full h-[520px] object-cover" />
          </div>
          <div className="absolute -bottom-6 -left-6 paper-card p-5 max-w-[240px] hidden md:block">
            <div className="overline">This month</div>
            <div className="font-serif-display text-2xl text-[#2a1106] mt-1">14 horses</div>
            <div className="text-xs text-stone-500 mt-1">3 vaccinations due · 2 farrier visits</div>
          </div>
        </div>
      </section>
    </div>
  );
}
