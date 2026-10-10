import React, { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, errMsg } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Syringe, Hammer, Stethoscope, Activity } from "lucide-react";

const HORSE_IMG = "https://images.pexels.com/photos/20145372/pexels-photo-20145372.jpeg?auto=compress&cs=tinysrgb&h=600";
const CATS = [
  { k: "Vaccination", icon: Syringe },
  { k: "Farrier", icon: Hammer },
  { k: "Dental", icon: Stethoscope },
  { k: "Physio", icon: Activity },
];

export default function HorseDetail() {
  const { id } = useParams();
  const [horse, setHorse] = useState(null);
  const [events, setEvents] = useState([]);
  const [feed, setFeed] = useState(null);
  const [tab, setTab] = useState("passport");

  const load = useCallback(async () => {
    const [h, e, f] = await Promise.all([
      api.get(`/horses/${id}`),
      api.get(`/care-events?horse_id=${id}`),
      api.get(`/feed-plans?horse_id=${id}`),
    ]);
    setHorse(h.data); setEvents(e.data); setFeed(f.data[0] || null);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const [feedForm, setFeedForm] = useState({ morning: "", midday: "", evening: "", supplements: "", daily_cost: 0 });
  useEffect(() => { if (feed) setFeedForm(feed); }, [feed]);

  const saveFeed = async () => {
    try {
      await api.post("/feed-plans", { horse_id: id, ...feedForm, daily_cost: parseFloat(feedForm.daily_cost) || 0 });
      toast.success("Feed plan saved");
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  if (!horse) return <div className="p-10 font-serif-display text-[#8c4921]">Loading…</div>;

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <Link to="/horses" className="link-brown text-sm inline-flex items-center gap-1 mb-6"><ArrowLeft size={14}/>Back to stable book</Link>

      <div className="paper-card overflow-hidden mb-8">
        <div className="grid grid-cols-1 md:grid-cols-5">
          <div className="md:col-span-2 h-64 md:h-auto bg-[#F3EDE2]">
            <img src={horse.image_url || HORSE_IMG} alt={horse.name} className="w-full h-full object-cover"/>
          </div>
          <div className="md:col-span-3 p-6 lg:p-8">
            <div className="overline">Passport</div>
            <h1 className="font-serif-display text-4xl text-[#2a1106] mt-2" data-testid="horse-name">{horse.name}</h1>
            <p className="text-stone-500 mt-1">{horse.breed} · {horse.color}</p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Info label="Owner" value={horse.owner_name || "Yard"} />
              <Info label="Lease" value={horse.lease_status} />
              <Info label="Stable wing" value={horse.stable_wing || "—"} />
              <Info label="Passport ID" value={horse.passport_id || "—"} mono />
              <Info label="UELN" value={horse.ueln || "—"} mono />
              <Info label="Monthly livery" value={`$${(horse.monthly_livery||0).toFixed(0)}`} mono />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {["passport","health","feed"].map(t => (
          <button key={t} onClick={()=>setTab(t)} data-testid={`hd-tab-${t}`} className={`px-4 py-2 rounded-full text-sm font-medium ${tab===t ? "bg-[#4a2410] text-[#FAF7F2]" : "border border-[#E5DEC9] text-stone-700 hover:bg-[#F3EDE2]"}`}>
            {t === "passport" ? "Overview" : t === "health" ? "Health History" : "Feed Plan"}
          </button>
        ))}
      </div>

      {tab === "passport" && (
        <div className="paper-card p-6">
          <h3 className="font-serif-display text-2xl mb-4 text-[#2a1106]">Recent activity</h3>
          {events.length === 0 ? <p className="text-stone-500 text-sm">No events logged yet.</p> : (
            <ul className="divide-y divide-[#E5DEC9]">
              {events.slice(0,10).map(ev => (
                <li key={ev.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-[#2a1106]">{ev.category} · {ev.practitioner || "—"}</div>
                    <div className="text-xs text-stone-500">{ev.notes || ""}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono-nums text-sm">{ev.date?.slice(0,10)}</div>
                    <div className="font-mono-nums text-xs text-[#1b4332]">${(ev.cost||0).toFixed(0)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "health" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CATS.map(({k, icon:Ic}) => {
            const list = events.filter(e => e.category === k);
            return (
              <div key={k} className="paper-card p-5">
                <div className="flex items-center gap-2 mb-3"><Ic size={18} className="text-[#8c4921]"/><h4 className="font-serif-display text-xl">{k}</h4></div>
                {list.length === 0 ? <p className="text-stone-500 text-xs">None yet.</p> :
                  <ul className="space-y-2">{list.slice(0,5).map(e => (
                    <li key={e.id} className="text-xs flex justify-between border-b border-[#E5DEC9] pb-1">
                      <span className="font-mono-nums">{e.date?.slice(0,10)}</span>
                      <span className="text-stone-500">{e.practitioner || ""}</span>
                    </li>
                  ))}</ul>
                }
              </div>
            );
          })}
        </div>
      )}

      {tab === "feed" && (
        <div className="paper-card p-6">
          <h3 className="font-serif-display text-2xl mb-4 text-[#2a1106]">Feed plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {["morning","midday","evening"].map(k => (
              <div key={k}>
                <label className="overline">{k}</label>
                <textarea data-testid={`feed-${k}`} value={feedForm[k]||""} onChange={e=>setFeedForm({...feedForm,[k]:e.target.value})} className="input mt-1 h-24 resize-none"/>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="overline">Supplements</label><input className="input mt-1" value={feedForm.supplements||""} onChange={e=>setFeedForm({...feedForm,supplements:e.target.value})}/></div>
            <div><label className="overline">Daily cost ($)</label><input type="number" step="0.5" className="input mt-1 font-mono-nums" value={feedForm.daily_cost||0} onChange={e=>setFeedForm({...feedForm,daily_cost:e.target.value})}/></div>
          </div>
          <div className="mt-6 flex justify-end"><button data-testid="feed-save" onClick={saveFeed} className="btn-primary">Save plan</button></div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, mono }) {
  return (
    <div>
      <div className="overline">{label}</div>
      <div className={`mt-1 text-sm text-[#2a1106] ${mono ? "font-mono-nums" : ""}`}>{value}</div>
    </div>
  );
}
