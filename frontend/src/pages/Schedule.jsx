import React, { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const CATS = ["Vaccination","Farrier","Dental","Physio"];

export default function Schedule() {
  const [events, setEvents] = useState([]);
  const [horses, setHorses] = useState([]);
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ horse_id: "", category: "Vaccination", date: new Date().toISOString().slice(0,10), next_due: "", practitioner: "", notes: "", cost: 0, billable_to_owner: true });

  const load = async () => {
    const [e, h] = await Promise.all([api.get("/care-events"), api.get("/horses")]);
    setEvents(e.data); setHorses(h.data);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/care-events", { ...form, cost: parseFloat(form.cost)||0 });
      toast.success("Event logged");
      setShowForm(false);
      setForm({ horse_id: "", category: "Vaccination", date: new Date().toISOString().slice(0,10), next_due: "", practitioner: "", notes: "", cost: 0, billable_to_owner: true });
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };
  const del = async (id) => { await api.delete(`/care-events/${id}`); toast.success("Removed"); load(); };

  const filtered = filter === "All" ? events : events.filter(e => e.category === filter);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const horseName = (id) => horses.find(h => h.id === id)?.name || "—";

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="overline">Yard schedule</div>
          <h1 className="font-serif-display text-4xl text-[#2a1106] mt-2">Care & Health Log</h1>
        </div>
        <button data-testid="care-add-btn" onClick={()=>setShowForm(true)} className="btn-primary inline-flex items-center gap-2"><Plus size={16}/>Log event</button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {["All",...CATS].map(c => (
          <button key={c} data-testid={`care-filter-${c}`} onClick={()=>setFilter(c)} className={`px-3 py-1.5 rounded-full text-sm font-medium ${filter===c ? "bg-[#4a2410] text-[#FAF7F2]" : "border border-[#E5DEC9] text-stone-700 hover:bg-[#F3EDE2]"}`}>{c}</button>
        ))}
      </div>

      <div className="paper-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-warm">
            <thead><tr><th>Date</th><th>Category</th><th>Horse</th><th>Practitioner</th><th>Next due</th><th>Cost</th><th>Bill</th><th></th></tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan="8" className="text-center text-stone-500 py-10">No events. Log the first one.</td></tr>
              )}
              {filtered.map(e => (
                <tr key={e.id}>
                  <td className="font-mono-nums">{e.date?.slice(0,10)}</td>
                  <td><span className="badge badge-due">{e.category}</span></td>
                  <td>{horseName(e.horse_id)}</td>
                  <td>{e.practitioner || "—"}</td>
                  <td className="font-mono-nums">{e.next_due || "—"}</td>
                  <td className="font-mono-nums">${(e.cost||0).toFixed(0)}</td>
                  <td>{e.billable_to_owner ? <span className="badge badge-ok">Owner</span> : <span className="badge badge-alert">Yard</span>}</td>
                  <td><button data-testid={`care-del-${e.id}`} onClick={()=>del(e.id)} className="text-[#BC4749] p-1"><Trash2 size={16}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-[#2a1106]/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={create} className="paper-card p-8 w-full max-w-2xl">
            <h2 className="font-serif-display text-2xl text-[#2a1106] mb-6">Log care event</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="overline">Horse</label>
                <select required data-testid="care-form-horse" className="input mt-1" value={form.horse_id} onChange={set("horse_id")}><option value="">Select…</option>{horses.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select>
              </div>
              <div><label className="overline">Category</label>
                <select data-testid="care-form-cat" className="input mt-1" value={form.category} onChange={set("category")}>{CATS.map(c=><option key={c}>{c}</option>)}</select>
              </div>
              <div><label className="overline">Date</label><input required data-testid="care-form-date" type="date" className="input mt-1" value={form.date} onChange={set("date")}/></div>
              <div><label className="overline">Next due</label><input type="date" className="input mt-1" value={form.next_due} onChange={set("next_due")}/></div>
              <div><label className="overline">Practitioner</label><input className="input mt-1" value={form.practitioner} onChange={set("practitioner")}/></div>
              <div><label className="overline">Cost ($)</label><input data-testid="care-form-cost" type="number" step="1" className="input mt-1 font-mono-nums" value={form.cost} onChange={set("cost")}/></div>
              <div className="md:col-span-2"><label className="overline">Notes</label><textarea className="input mt-1 resize-none h-20" value={form.notes} onChange={set("notes")}/></div>
              <label className="md:col-span-2 flex items-center gap-2 text-sm text-stone-700">
                <input type="checkbox" checked={form.billable_to_owner} onChange={e=>setForm({...form,billable_to_owner:e.target.checked})}/>
                Billable to owner
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={()=>setShowForm(false)} className="btn-ghost">Cancel</button>
              <button data-testid="care-form-submit" type="submit" className="btn-primary">Save event</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
