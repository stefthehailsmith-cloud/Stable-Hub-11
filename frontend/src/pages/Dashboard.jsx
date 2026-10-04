import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Home as HomeIcon, Syringe, Hammer, Stethoscope, Activity, TrendingUp, Wallet, Plus } from "lucide-react";

const catIcon = { Vaccination: Syringe, Farrier: Hammer, Dental: Stethoscope, Physio: Activity };

export default function Dashboard() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/dashboard/summary").then(r => setD(r.data)); }, []);
  if (!d) return <div className="p-10 font-serif-display text-[#8c4921]">Loading yard…</div>;

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-4 mb-8">
        <div>
          <div className="overline">Yard log · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
          <h1 className="font-serif-display text-4xl lg:text-5xl text-[#2a1106] mt-2">Good day, {user?.name?.split(" ")[0]}.</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/horses" data-testid="dash-add-horse" className="btn-primary inline-flex items-center gap-2"><Plus size={16}/>New horse</Link>
          <Link to="/schedule" className="btn-ghost">Log care event</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard icon={HomeIcon} label="Horses on yard" value={d.horse_count} accent="#4a2410" testid="stat-horse-count" />
        <StatCard icon={Bell} label="Care due (30d)" value={d.upcoming_care.length} accent="#B07D34" testid="stat-upcoming" />
        <StatCard icon={TrendingUp} label="Monthly livery" value={`$${d.monthly_livery_income.toFixed(0)}`} accent="#1b4332" testid="stat-livery" />
        <StatCard icon={Wallet} label="Yard fee (subscription)" value={`$${d.yard_monthly_fee.toFixed(2)}`} accent="#8c4921" testid="stat-yardfee" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 paper-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif-display text-2xl text-[#2a1106]">Upcoming care</h3>
            <Link to="/schedule" className="link-brown text-sm">View all →</Link>
          </div>
          {d.upcoming_care.length === 0 ? (
            <p className="text-stone-500 text-sm">Nothing due in the next 30 days. Beautiful.</p>
          ) : (
            <ul className="divide-y divide-[#E5DEC9]">
              {d.upcoming_care.slice(0, 8).map((c) => {
                const I = catIcon[c.category] || Bell;
                return (
                  <li key={c.id} className="py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F3EDE2] flex items-center justify-center text-[#8c4921]"><I size={18}/></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[#2a1106]">{c.category}{c.practitioner ? ` · ${c.practitioner}` : ""}</div>
                      <div className="text-xs text-stone-500 font-mono-nums">Due {c.next_due}</div>
                    </div>
                    <span className="badge badge-due">Due</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="paper-card p-6">
          <h3 className="font-serif-display text-2xl text-[#2a1106] mb-2">Overdue</h3>
          <p className="text-xs text-stone-500 mb-4">Care events past their next-due date.</p>
          {d.overdue_care.length === 0 ? (
            <p className="text-stone-500 text-sm">All caught up.</p>
          ) : (
            <ul className="space-y-2">
              {d.overdue_care.slice(0,6).map(c => (
                <li key={c.id} className="p-3 rounded-lg bg-[#BC4749]/5 border border-[#BC4749]/20 flex items-center justify-between">
                  <span className="text-sm text-[#2a1106] font-medium">{c.category}</span>
                  <span className="badge badge-alert font-mono-nums">{c.next_due}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8 paper-card p-6 bg-gradient-to-br from-white to-[#F3EDE2]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="overline">Yard subscription</div>
            <h3 className="font-serif-display text-2xl text-[#2a1106] mt-1">{d.horse_count} × 75
            /horse = <span className="font-mono-nums">${d.yard_monthly_fee.toFixed(2)}</span>/mo</h3>
            <p className="text-sm text-stone-500 mt-1">{d.subscription.active ? "Latest payment: Active" : "No active subscription yet."}</p>
          </div>
          <Link to="/billing" data-testid="dash-manage-sub" className="btn-secondary">Manage subscription</Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent, testid }) {
  return (
    <div className="paper-card p-5" data-testid={testid}>
      <div className="flex items-center justify-between">
        <div className="overline">{label}</div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${accent}15`, color: accent }}>
          <Icon size={16} />
        </div>
      </div>
      <div className="mt-3 font-mono-nums text-3xl text-[#2a1106]">{value}</div>
    </div>
  );
}
