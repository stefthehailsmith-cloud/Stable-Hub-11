import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Home, Calendar, Wallet, Trophy, Receipt, Users, LogOut, Menu } from "lucide-react";

const managerLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/horses", label: "Horses", icon: Home },
  { to: "/schedule", label: "Care Schedule", icon: Calendar },
  { to: "/expenses", label: "Feed & Expenses", icon: Wallet },
  { to: "/competitions", label: "Competitions", icon: Trophy },
  { to: "/billing", label: "Billing", icon: Receipt },
];
const ownerLinks = [
  { to: "/owner-portal", label: "My Horses", icon: Home },
  { to: "/billing", label: "My Statements", icon: Receipt },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const links = user?.role === "owner" ? ownerLinks : managerLinks;

  const doLogout = async () => { await logout(); navigate("/login"); };

  return (
    <div className="min-h-screen flex bg-[#FAF7F2]">
      <aside className={`${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static z-40 h-screen w-72 bg-white border-r border-[#E5DEC9] flex flex-col transition-transform duration-200`}>
        <div className="p-6 border-b border-[#E5DEC9]">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#4a2410] flex items-center justify-center text-[#D4A373] font-serif-display text-xl">H</div>
            <div>
              <div className="font-serif-display text-lg leading-tight text-[#2a1106]">Stable Hub</div>
              <div className="overline text-[10px]">Manager</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} data-testid={`nav-${l.to.slice(1)}`} className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
              <l.icon size={18} />
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-[#E5DEC9]">
          <div className="mb-3">
            <div className="text-xs overline">Signed in</div>
            <div className="text-sm font-medium text-[#2a1106]" data-testid="user-name">{user?.name}</div>
            <div className="text-xs text-stone-500">{user?.email}</div>
          </div>
          <button data-testid="logout-btn" onClick={doLogout} className="btn-ghost w-full flex items-center gap-2 justify-center">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-[#E5DEC9] flex items-center justify-between p-4">
          <button onClick={() => setOpen(!open)} className="p-2"><Menu size={20} /></button>
          <div className="font-serif-display text-lg">Stable Hub</div>
          <div className="w-8" />
        </header>
        <main className="fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
