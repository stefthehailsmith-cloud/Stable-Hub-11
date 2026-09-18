import React, { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const CATS = ["Hay","Bedding","Feed","Vet","Utilities","Farrier","Other"];

export default function Expenses() {
  const [items, setItems] = useState([]);
  const [horses, setHorses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), category: "Feed", description: "", amount: 0, horse_id: "", billable_to_owner: false });

  const load = async () => {
    const [e,h] = await Promise.all([api.get("/expenses"), api.get("/horses")]);
    setItems(e.data); setHorses(h.data);
  };
  useEffect(() => { load(); }, []);
  const set = (k) => (ev) => setForm({...form,[k]:ev.target.value});
  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/expenses", { ...form, amount: parseFloat(form.amount)||0, horse_id: form.horse_id || null });
      toast.success("Expense logged");
      setShowForm(false);
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };
  const del = async (id) => { await api.delete(`/expenses/${id}`); load(); };

  const total = items.reduce((s,i)=>s+(i.amount||0), 0);
  const byCat = CATS.map(c => ({ c, t: items.filter(i=>i.category===c).reduce((s,i)=>s+(i.amount||0),0) }));

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="overline">The ledger</div>
          <h1 className="font-serif-display text-4xl text-[#2a1106] mt-2">Feed & Expenses</h1>
        </div>
        <button data-testid="exp-add-btn" onClick={()=>setShowForm(true)} className="btn-primary inline-flex items-center gap-2"><Plus size={16}/>Add expense</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <div className="paper-card p-4 col-span-2 md:col-span-1 lg:col-span-2">
          <div className="overline">Total</div>
          <div className="font-mono-nums text-3xl text-[#2a1106] mt-2">${total.toFixed(0)}</div>
        </div>
        {byCat.map(({c,t}) => (
          <div key={c} className="paper-card p-4">
            <div className="overline">{c}</div>
            <div className="font-mono-nums text-lg text-[#8c4921] mt-2">${t.toFixed(0)}</div>
          </div>
        ))}
      </div>

      <div className="paper-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-warm">
            <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Horse</th><th>Bill</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {items.length===0 && <tr><td colSpan="7" className="text-center text-stone-500 py-10">No expenses logged.</td></tr>}
              {items.map(i => (
                <tr key={i.id}>
                  <td className="font-mono-nums">{i.date?.slice(0,10)}</td>
                  <td><span className="badge badge-due">{i.category}</span></td>
                  <td className="font-medium text-[#2a1106]">{i.description}</td>
                  <td>{horses.find(h=>h.id===i.horse_id)?.name || "—"}</td>
                  <td>{i.billable_to_owner ? <span className="badge badge-ok">Owner</span> : <span className="badge badge-alert">Yard</span>}</td>
                  <td className="font-mono-nums text-right">${(i.amount||0).toFixed(2)}</td>
                  <td><button data-testid={`exp-del-${i.id}`} onClick={()=>del(i.id)} className="text-[#BC4749]"><Trash2 size={16}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-[#2a1106]/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={create} className="paper-card p-8 w-full max-w-2xl">
            <h2 className="font-serif-display text-2xl mb-6 text-[#2a1106]">Log expense</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="overline">Date</label><input required data-testid="exp-form-date" type="date" className="input mt-1" value={form.date} onChange={set("date")}/></div>
              <div><label className="overline">Category</label><select data-testid="exp-form-cat" className="input mt-1" value={form.category} onChange={set("category")}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
              <div className="md:col-span-2"><label className="overline">Description</label><input required data-testid="exp-form-desc" className="input mt-1" value={form.description} onChange={set("description")}/></div>
              <div><label className="overline">Horse (optional)</label><select className="input mt-1" value={form.horse_id} onChange={set("horse_id")}><option value="">Yard-wide</option>{horses.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select></div>
              <div><label className="overline">Amount ($)</label><input required data-testid="exp-form-amount" type="number" step="0.01" className="input mt-1 font-mono-nums" value={form.amount} onChange={set("amount")}/></div>
              <label className="md:col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.billable_to_owner} onChange={e=>setForm({...form,billable_to_owner:e.target.checked})}/>Bill through to owner</label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={()=>setShowForm(false)} className="btn-ghost">Cancel</button>
              <button data-testid="exp-form-submit" type="submit" className="btn-primary">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
