import { Routes, Route, Navigate } from "react-router-dom";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import AdminLayout from "@/pages/AdminLayout";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminSorteios from "@/pages/admin/Sorteios";
import AdminCartoes from "@/pages/admin/Cartoes";
import AdminConfiguracoes from "@/pages/admin/Configuracoes";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="sorteios" element={<AdminSorteios />} />
        <Route path="cartoes" element={<AdminCartoes />} />
        <Route path="configuracoes" element={<AdminConfiguracoes />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
