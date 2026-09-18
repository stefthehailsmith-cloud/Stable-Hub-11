import React, { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CreditCard, FileText } from "lucide-react";

export default function Billing() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [statements, setStatements] = useState([]);
  const [horseCount, setHorseCount] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/dashboard/summary").then(r => { setSummary(r.data); setHorseCount(Math.max(1, r.data.horse_count)); });
    api.get("/owner-statements").then(r => setStatements(r.data));
  }, []);

  const checkout = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/payments/checkout", { horse_count: horseCount, origin_url: window.location.origin });
      window.location.href = data.checkout_url;
    } catch (e) { toast.error(errMsg(e)); setLoading(false); }
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="overline">The Counting House</div>
      <h1 className="font-serif-display text-4xl text-[#2a1106] mt-2 mb-8">{user?.role === "owner" ? "My Statements" : "Billing"}</h1>

      {user?.role !== "owner" && (
        <div className="paper-card p-8 mb-8 bg-gradient-to-br from-white to-[#F3EDE2]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="overline">Yard subscription</div>
              <h2 className="font-serif-display text-3xl text-[#2a1106] mt-2">Simple, per-horse pricing</h2>
              <p className="text-stone-700 mt-3">One flat rate — <span className="font-mono-nums text-[#8c4921]">$4</span> per horse per month. Cancel any time.</p>
              <div className="mt-6">
                <label className="overline">Horses to bill for</label>
                <div className="flex items-center gap-4 mt-2">
                  <input data-testid="sub-count" type="number" min="1" max="500" className="input font-mono-nums w-32" value={horseCount} onChange={e=>setHorseCount(Math.max(1, parseInt(e.target.value)||1))}/>
                  <span className="font-mono-nums text-3xl text-[#4a2410]" data-testid="sub-total">${(horseCount*4).toFixed(2)}<span className="text-sm text-stone-500">/mo</span></span>
                </div>
              </div>
              <button data-testid="sub-checkout" onClick={checkout} disabled={loading} className="btn-primary mt-6 inline-flex items-center gap-2"><CreditCard size={16}/>{loading ? "Redirecting…" : "Pay monthly with Stripe"}</button>
              {summary?.subscription?.active && <div className="mt-3 badge badge-ok">Latest subscription paid</div>}
            </div>
            <div className="paper-card p-6 bg-white">
              <div className="overline mb-2">Included</div>
              <ul className="space-y-2 text-sm text-stone-700">
                {["Unlimited horses, owners & leases","Vaccination, farrier, dental & physio scheduling","Feed plans & expense ledger","Competition tracker","Owner statements","Email reminders (soon)"].map(x => (
                  <li key={x} className="flex gap-2"><span className="text-[#2d6a4f]">✓</span>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <h2 className="font-serif-display text-2xl text-[#2a1106] mb-4">Owner statements — this month</h2>
      {statements.length === 0 ? (
        <div className="paper-card p-8 text-center text-stone-500">No billable items this month yet.</div>
      ) : (
        <div className="space-y-4">
          {statements.map((s,i) => (
            <div key={i} className="paper-card p-6" data-testid={`statement-${i}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="overline">{s.month}</div>
                  <h3 className="font-serif-display text-2xl text-[#2a1106] mt-1">{s.owner}</h3>
                  <div className="text-xs text-stone-500">Horses: {s.horses.join(", ")}</div>
                </div>
                <div className="text-right">
                  <div className="overline">Total</div>
                  <div className="font-mono-nums text-3xl text-[#1b4332]">${s.total.toFixed(2)}</div>
                </div>
              </div>
              <div className="border-t border-[#E5DEC9] pt-3">
                <ul className="text-sm divide-y divide-[#E5DEC9]">
                  {s.items.map((li,j)=>(
                    <li key={j} className="py-2 flex justify-between"><span className="text-stone-700">{li.desc}</span><span className="font-mono-nums text-[#2a1106]">${li.amount.toFixed(2)}</span></li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 text-xs text-stone-400 inline-flex items-center gap-1"><FileText size={12}/>Statement generated live from care events & expenses marked as billable.</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
