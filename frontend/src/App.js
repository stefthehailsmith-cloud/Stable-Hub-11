import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Horses from "@/pages/Horses";
import HorseDetail from "@/pages/HorseDetail";
import Schedule from "@/pages/Schedule";
import Expenses from "@/pages/Expenses";
import Competitions from "@/pages/Competitions";
import Billing from "@/pages/Billing";
import OwnerPortal from "@/pages/OwnerPortal";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCancel from "@/pages/PaymentCancel";
import "@/App.css";

function Protected({ children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (user === null) return <div className="min-h-screen flex items-center justify-center text-[#8c4921] font-serif-display">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/cancel" element={<PaymentCancel />} />

      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/horses" element={<Horses />} />
        <Route path="/horses/:id" element={<HorseDetail />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/competitions" element={<Competitions />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/owner-portal" element={<OwnerPortal />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster richColors position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}
