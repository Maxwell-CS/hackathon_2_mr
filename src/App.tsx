import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TropelsPage } from "./pages/TropelsPage";
import { SignalsFeedPage } from "./pages/SignalsFeedPage";
import { SectorsPage } from "./pages/SectorsPage";
import { SectorStoryPage } from "./pages/SectorStoryPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Protected area */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tropels" element={<TropelsPage />} />
              <Route path="/signals/feed" element={<SignalsFeedPage />} />
              <Route path="/sectors" element={<SectorsPage />} />
              <Route path="/sectors/:id/story" element={<SectorStoryPage />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
