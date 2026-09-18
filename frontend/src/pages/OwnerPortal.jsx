import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";

export default function OwnerPortal() {
  const [horses, setHorses] = useState([]);
  const [events, setEvents] = useState([]);
  useEffect(() => {
    api.get("/horses").then(r => setHorses(r.data));
    api.get("/care-events").then(r => setEvents(r.data));
  }, []);
  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <div className="overline">Owner portal</div>
      <h1 className="font-serif-display text-4xl text-[#2a1106] mt-2 mb-8">My horses</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {horses.map(h => {
          const recent = events.filter(e => e.horse_id === h.id).slice(0,3);
          return (
            <div key={h.id} className="paper-card p-6">
              <h3 className="font-serif-display text-2xl text-[#2a1106]">{h.name}</h3>
              <div className="text-xs text-stone-500 mt-1">{h.breed} · {h.lease_status}</div>
              <div className="mt-4">
                <div className="overline mb-2">Recent care</div>
                {recent.length === 0 ? <p className="text-xs text-stone-500">No records yet.</p> : (
                  <ul className="text-sm space-y-1">{recent.map(r => (
                    <li key={r.id} className="flex justify-between border-b border-[#E5DEC9] pb-1"><span>{r.category} · {r.practitioner || "—"}</span><span className="font-mono-nums text-stone-500">{r.date?.slice(0,10)}</span></li>
                  ))}</ul>
                )}
              </div>
            </div>
          );
        })}
        {horses.length === 0 && <div className="paper-card p-8 text-stone-500">No horses linked to your account yet.</div>}
      </div>
      <div className="mt-6"><Link to="/billing" className="link-brown text-sm">View my statements →</Link></div>
    </div>
  );
}
