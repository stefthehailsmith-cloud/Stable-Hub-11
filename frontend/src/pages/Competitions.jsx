import React, { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Trophy } from "lucide-react";

export default function Competitions() {
  const [items, setItems] = useState([]);
  const [horses, setHorses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ horse_id: "", show_name: "", date: new Date().toISOString().slice(0,10), discipline: "Show Jumping", class_name: "", entry_fee: 0, placing: "", rider: "", notes: "" });

  const load = async () => {
    const [c,h] = await Promise.all([api.get("/competitions"), api.get("/horses")]);
    setItems(c.data); setHorses(h.data);
  };
  useEffect(()=>{load()},[]);
  const set = (k)=>(e)=>setForm({...form,[k]:e.target.value});
  const create = async(e)=>{ e.preventDefault(); try { await api.post("/competitions", {...form, entry_fee: parseFloat(form.entry_fee)||0}); toast.success("Entry saved"); setShowForm(false); load(); } catch(err){toast.error(errMsg(err))} };
  const del = async(id)=>{ await api.delete(`/competitions/${id}`); load(); };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="overline">Show ring</div>
          <h1 className="font-serif-display text-4xl text-[#2a1106] mt-2">Competition Entries</h1>
        </div>
        <button data-testid="comp-add-btn" onClick={()=>setShowForm(true)} className="btn-primary inline-flex items-center gap-2"><Plus size={16}/>New entry</button>
      </div>

      {items.length === 0 ? (
        <div className="paper-card p-12 text-center text-stone-500">No competition entries yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(c => (
            <div key={c.id} className="paper-card p-5">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-full bg-[#D4A373]/15 flex items-center justify-center"><Trophy size={18} className="text-[#B07D34]"/></div>
                <button data-testid={`comp-del-${c.id}`} onClick={()=>del(c.id)} className="text-[#BC4749]"><Trash2 size={16}/></button>
              </div>
              <div className="font-serif-display text-xl mt-3 text-[#2a1106]">{c.show_name}</div>
              <div className="text-xs text-stone-500 mt-1 font-mono-nums">{c.date?.slice(0,10)} · {c.discipline}</div>
              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-stone-500">Horse</span><span className="text-[#2a1106]">{horses.find(h=>h.id===c.horse_id)?.name||"—"}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">Class</span><span>{c.class_name||"—"}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">Rider</span><span>{c.rider||"—"}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">Entry fee</span><span className="font-mono-nums">${(c.entry_fee||0).toFixed(0)}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">Placing</span><span className="font-medium">{c.placing || <span className="text-stone-400">—</span>}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-[#2a1106]/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={create} className="paper-card p-8 w-full max-w-2xl">
            <h2 className="font-serif-display text-2xl mb-6 text-[#2a1106]">New competition entry</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="overline">Horse</label><select required data-testid="comp-form-horse" className="input mt-1" value={form.horse_id} onChange={set("horse_id")}><option value="">Select…</option>{horses.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select></div>
              <div><label className="overline">Show name</label><input required data-testid="comp-form-show" className="input mt-1" value={form.show_name} onChange={set("show_name")}/></div>
              <div><label className="overline">Date</label><input required type="date" className="input mt-1" value={form.date} onChange={set("date")}/></div>
              <div><label className="overline">Discipline</label><select className="input mt-1" value={form.discipline} onChange={set("discipline")}><option>Show Jumping</option><option>Dressage</option><option>Eventing</option><option>Endurance</option><option>Western</option></select></div>
              <div><label className="overline">Class</label><input className="input mt-1" value={form.class_name} onChange={set("class_name")}/></div>
              <div><label className="overline">Rider</label><input className="input mt-1" value={form.rider} onChange={set("rider")}/></div>
              <div><label className="overline">Entry fee ($)</label><input type="number" step="1" className="input mt-1 font-mono-nums" value={form.entry_fee} onChange={set("entry_fee")}/></div>
              <div><label className="overline">Placing</label><input className="input mt-1" placeholder="e.g. 1st, Clear round" value={form.placing} onChange={set("placing")}/></div>
              <div className="md:col-span-2"><label className="overline">Notes</label><textarea className="input mt-1 resize-none h-20" value={form.notes} onChange={set("notes")}/></div>
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={()=>setShowForm(false)} className="btn-ghost">Cancel</button><button data-testid="comp-form-submit" className="btn-primary">Save</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
