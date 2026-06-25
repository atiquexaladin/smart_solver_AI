import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "./api";

type LiveClass = {
  id: string;
  name: string;
  subject: string;
  startAt: string;
  durationMinutes: number;
  meetingId: string;
  joinSlug: string;
  status: "scheduled" | "live" | "ended";
  joinLink: string;
  participantCount: number;
};

export default function DashboardPage() {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [join, setJoin] = useState({ meetingId: "", meetingPassword: "" });
  const [greeting, setGreeting] = useState<"welcome" | "welcome_back" | null>(null);
  const [userName, setUserName] = useState<string>("");
  const navigate = useNavigate();

  const socket: Socket | null = useMemo(() => io({ autoConnect: true }), []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<LiveClass[]>("/api/live-classes");
      setClasses(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        
        const storedUser = localStorage.getItem("ss_user");
        let email = "";
        try {
          const parsed = storedUser ? JSON.parse(storedUser) : null;
          email = typeof parsed?.email === "string" ? parsed.email.toLowerCase().trim() : "";
        } catch {
          email = "";
        }

        const flagKey = email ? `ss_login_isFirstLogin_${email}` : "";
        const flag = flagKey ? localStorage.getItem(flagKey) : null;
        if (flag === "1" || flag === "0") {
          localStorage.removeItem(flagKey);
          const name = (() => {
            try {
              const parsed = storedUser ? JSON.parse(storedUser) : null;
              return typeof parsed?.name === "string" ? parsed.name : "";
            } catch {
              return "";
            }
          })();
          setUserName(name);
          setGreeting(flag === "1" ? "welcome" : "welcome_back");
          setTimeout(() => {
            if (!cancelled) setGreeting(null);
          }, 5000);
          return;
        }

        const me = await apiFetch<{ user: { name: string; loginCount: number } }>("/api/me");
        if (cancelled) return;

        const loginCount = me?.user?.loginCount ?? 0;
        const name = me?.user?.name ?? "";
        setUserName(name);

        
        setGreeting(loginCount <= 1 ? "welcome" : "welcome_back");
      } catch {
        if (cancelled) return;
        setGreeting("welcome");
      }

      setTimeout(() => {
        if (!cancelled) setGreeting(null);
      }, 5000);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = (payload: { classId: string; participantCount: number }) => {
      setClasses((prev) => prev.map((c) => (c.id === payload.classId ? { ...c, participantCount: payload.participantCount } : c)));
    };
    socket.on("classes:update", onUpdate);
    return () => {
      socket.off("classes:update", onUpdate);
      socket.disconnect();
    };
  }, [socket]);

  const logout = () => {
    localStorage.removeItem("ss_token");
    window.location.href = "/chat";
  };

  const joinById = (e: React.FormEvent) => {
    e.preventDefault();
    const meetingId = join.meetingId.trim();
    const meetingPassword = join.meetingPassword.trim();
    if (!meetingId || !meetingPassword) return;
    navigate(`/meet?meetingId=${encodeURIComponent(meetingId)}&meetingPassword=${encodeURIComponent(meetingPassword)}`);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-[#0A0A0B]/80 backdrop-blur-md">
        <div>
          <div className="text-sm font-bold uppercase tracking-widest text-indigo-400">User Dashboard</div>
          <div className="text-xs text-slate-500">Students only</div>
        </div>
        <div className="flex items-center gap-2">
          <a
            className="px-3 py-2 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 hover:border-indigo-500/50"
            href="/chat"
          >
            AI Chat
          </a>
          <button onClick={logout} className="px-3 py-2 rounded-lg text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 md:p-10 space-y-8">
        {greeting === "welcome" && (
          <div className="rounded-3xl border border-indigo-500/30 bg-indigo-500/10 p-6 text-center">
            <h1 className="text-3xl font-bold text-indigo-300">Welcome, {userName}! 👋</h1>
            <p className="text-sm text-slate-400 mt-2">Ready to join a live class? Select one below to get started.</p>
          </div>
        )}

        {greeting === "welcome_back" && (
          <div className="rounded-3xl border border-slate-700 bg-slate-900/40 p-4 text-center">
            <h2 className="text-xl font-semibold text-slate-300">Welcome back, {userName}! 😊</h2>
          </div>
        )}

        <section className="rounded-3xl border border-slate-800 bg-[#111113] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Join Live</h2>
            <button
              onClick={load}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 hover:border-indigo-500/50"
            >
              Refresh
            </button>
          </div>

          {error && <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium text-center">{error}</div>}

          {loading ? (
            <div className="mt-6 text-sm text-slate-500">Loading...</div>
          ) : classes.length === 0 ? (
            <div className="mt-6 text-sm text-slate-500">No classes yet</div>
          ) : (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {classes.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40">
                  <div className="font-bold">{c.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{c.subject}</div>
                  <div className="text-xs text-slate-400 mt-2">
                    Start: <span className="text-slate-200 font-semibold">{new Date(c.startAt).toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Joined: <span className="text-slate-200 font-semibold">{c.participantCount}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <a
                      href={`/meet/${c.joinSlug}`}
                      className="flex-1 text-center px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                    >
                      Join via link
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(c.meetingId);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-xs font-bold"
                      title="Copy meeting ID"
                    >
                      ID
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-2">Meeting ID: {c.meetingId}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-[#111113] p-6">
          <h2 className="text-lg font-bold">Join by Meeting ID</h2>
          <p className="text-xs text-slate-500 mt-1">Enter the Meeting ID + Password shared by your teacher.</p>
          <form onSubmit={joinById} className="mt-6 grid gap-3 md:grid-cols-3">
            <input
              value={join.meetingId}
              onChange={(e) => setJoin((p) => ({ ...p, meetingId: e.target.value }))}
              placeholder="Meeting ID"
              className="px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 outline-none focus:border-indigo-500"
            />
            <input
              value={join.meetingPassword}
              onChange={(e) => setJoin((p) => ({ ...p, meetingPassword: e.target.value }))}
              placeholder="Password"
              className="px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 outline-none focus:border-indigo-500"
            />
            <button className="py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              Join
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

