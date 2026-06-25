import React from "react";

import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import App from "./App";
import AdminLoginPage from "./live/AdminLoginPage";
import AdminPanelPage from "./live/AdminPanelPage";
import MeetingRoomPage from "./live/MeetingRoomPage";


class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("❌ Error caught by boundary:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", color: "red", fontFamily: "monospace" }}>
          <h2>Something went wrong!</h2>
          <p>{this.state.error?.message}</p>
          <pre style={{ background: "#f0f0f0", padding: "10px", overflow: "auto" }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

function parseJwt(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch {
    return null;
  }
}

function useAuthSnapshot() {
  const token = localStorage.getItem("ss_token") || "";
  const payload = token ? parseJwt(token) : null;
  const role = payload?.role === "admin" ? "admin" : payload?.role === "student" ? "student" : null;
  return { token, role };
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token } = useAuthSnapshot();
  const loc = useLocation();
  if (!token) return <Navigate to="/chat" state={{ from: loc.pathname }} replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { token, role } = useAuthSnapshot();
  const loc = useLocation();
  if (!token || role !== "admin") return <Navigate to="/admin/login" state={{ from: loc.pathname }} replace />;
  return <>{children}</>;
}

function RequireStudent({ children }: { children: React.ReactNode }) {
  const { token, role } = useAuthSnapshot();
  const loc = useLocation();
  if (!token) return <Navigate to="/chat" state={{ from: loc.pathname }} replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  return <>{children}</>;
}


function HomeRedirect() {
  const { token, role } = useAuthSnapshot();
  if (!token) return <Navigate to="/chat" replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  return <Navigate to="/chat" replace />;  
}

export default function Root() {
  console.log('📍 Root component rendering');
  
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/chat" element={<App />} />
        <Route path="/meet" element={<AuthGuard><MeetingRoomPage /></AuthGuard>} />
        <Route path="/meet/:joinSlug" element={<AuthGuard><MeetingRoomPage /></AuthGuard>} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<RequireAdmin><AdminPanelPage /></RequireAdmin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

