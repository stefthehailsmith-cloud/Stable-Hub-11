import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, errMsg } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const HORSE_IMG = "https://images.unsplash.com/photo-1746566841253-44181b0a042c?crop=entropy&cs=srgb&fm=jpg&h=400&w=600";

export default function Horses() {
  const [horses, setHorses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", breed: "", color: "", passport_id: "", ueln: "", owner_name: "", lease_status: "Owned", stable_wing: "", monthly_livery: 0 });

  const load = () => api.get("/horses").then(r => setHorses(r.data));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/horses", { ...form, monthly_livery: parseFloat(form.monthly_livery) || 0 });
      toast.success(`${form.name} added to the yard`);
      setShowModal(false);
      setForm({ name: "", breed: "", color: "", passport_id: "", ueln: "", owner_name: "", lease_status: "Owned", stable_wing: "", monthly_livery: 0 });
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };
  const del = async (id) => {
    if (!window.confirm("Remove this horse and all its records?")) return;
    await api.delete(`/horses/${id}`);
    toast.success("Horse removed");
    load();
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="overline">The Stable Book</div>
          <h1 className="font-serif-display text-4xl text-[#2a1106] mt-2">Horses <span className="text-stone-400 font-mono-nums text-2xl">· {horses.length}</span></h1>
        </div>
        <button data-testid="horses-add-btn" onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center gap-2"><Plus size={16}/>Add horse</button>
      </div>

      {horses.length === 0 ? (
        <div className="paper-card p-12 text-center">
          <p className="text-stone-500">Your stable book is empty. Add your first horse to begin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {horses.map((h) => (
            <div key={h.id} className="paper-card overflow-hidden" data-testid={`horse-card-${h.id}`}>
              <div className="h-40 relative bg-[#F3EDE2]">
                <img src={h.image_url || HORSE_IMG} alt={h.name} className="w-full h-full object-cover" />
                <div className="absolute top-3 right-3"><span className="badge badge-ok">{h.lease_status}</span></div>
              </div>
              <div className="p-5">
                <Link to={`/horses/${h.id}`} className="block font-serif-display text-xl text-[#2a1106] hover:text-[#8c4921]">{h.name}</Link>
                <div className="text-xs text-stone-500 mt-1">{h.breed || "—"} · {h.color || ""}</div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-stone-500">Owner</span>
                  <span className="text-xs text-[#2a1106] font-medium">{h.owner_name || "Yard"}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-stone-500">Livery</span>
                  <span className="font-mono-nums text-sm text-[#1b4332]">${(h.monthly_livery || 0).toFixed(0)}/mo</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link to={`/horses/${h.id}`} className="btn-ghost flex-1 text-center text-sm">Open</Link>
                  <button data-testid={`horse-del-${h.id}`} onClick={() => del(h.id)} className="btn-ghost p-2 text-[#BC4749]"><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-[#2a1106]/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={create} className="paper-card p-8 w-full max-w-2xl">
            <h2 className="font-serif-display text-2xl text-[#2a1106] mb-6">Add a horse</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Name" required><input required data-testid="horse-form-name" className="input" value={form.name} onChange={set("name")}/></Field>
              <Field label="Breed"><input data-testid="horse-form-breed" className="input" value={form.breed} onChange={set("breed")}/></Field>
              <Field label="Color"><input className="input" value={form.color} onChange={set("color")}/></Field>
              <Field label="Stable wing"><input className="input" value={form.stable_wing} onChange={set("stable_wing")}/></Field>
              <Field label="Passport ID"><input className="input" value={form.passport_id} onChange={set("passport_id")}/></Field>
              <Field label="UELN"><input className="input" value={form.ueln} onChange={set("ueln")}/></Field>
              <Field label="Owner name"><input data-testid="horse-form-owner" className="input" value={form.owner_name} onChange={set("owner_name")}/></Field>
              <Field label="Lease status">
                <select className="input" value={form.lease_status} onChange={set("lease_status")}>
                  <option>Owned</option><option>Full Lease</option><option>Part Lease</option><option>Full Board</option>
                </select>
              </Field>
              <Field label="Monthly livery ($)"><input data-testid="horse-form-livery" type="number" min="0" step="1" className="input" value={form.monthly_livery} onChange={set("monthly_livery")}/></Field>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={()=>setShowModal(false)} className="btn-ghost">Cancel</button>
              <button data-testid="horse-form-submit" type="submit" className="btn-primary">Add horse</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="overline">{label}{required && " *"}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
