import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
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
  participantCount?: number;
};

export default function AdminPanelPage() {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    subject: "",
    startAt: "",
    durationMinutes: "60",
    meetingId: "",
    meetingPassword: "",
  });
  const [createdInfo, setCreatedInfo] = useState<null | { joinLink: string; meetingId: string; meetingPassword: string }>(null);

  const socket: Socket | null = useMemo(() => io({ autoConnect: true }), []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<LiveClass[]>("/api/admin/live-classes");
      setClasses(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    
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

  const createClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreatedInfo(null);
    try {
      const payload: any = {
        name: form.name,
        subject: form.subject,
        startAt: form.startAt,
        durationMinutes: Number(form.durationMinutes),
      };
      if (form.meetingId.trim()) payload.meetingId = form.meetingId.trim();
      if (form.meetingPassword.trim()) payload.meetingPassword = form.meetingPassword.trim();
      const res = await apiFetch<any>("/api/admin/live-classes", { method: "POST", body: JSON.stringify(payload) });
      setCreatedInfo({ joinLink: res.joinLink, meetingId: res.meetingId, meetingPassword: res.meetingPassword });
      await load();
      setForm({ name: "", subject: "", startAt: "", durationMinutes: "60", meetingId: "", meetingPassword: "" });
    } catch (e: any) {
      setError(e?.message || "Failed to create");
    }
  };

  const startClass = async (id: string) => {
    await apiFetch(`/api/admin/live-classes/${id}/start`, { method: "POST" });
    await load();
  };

  const endClass = async (id: string) => {
    await apiFetch(`/api/admin/live-classes/${id}/end`, { method: "POST" });
    await load();
  };

  const deleteClass = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this class?")) return;
    try {
      await apiFetch(`/api/admin/live-classes/${id}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to delete class");
    }
  };

  const logout = () => {
    localStorage.removeItem("ss_token");
    window.location.href = "/admin/login";
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-[#0A0A0B]/80 backdrop-blur-md">
        <div>
          <div className="text-sm font-bold uppercase tracking-widest text-indigo-400">Admin Panel</div>
          <div className="text-xs text-slate-500">Live classes management</div>
        </div>
        <div className="flex items-center gap-2">
          <a
            className="px-3 py-2 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 hover:border-indigo-500/50"
            href="/chat"
          >
            Student view
          </a>
          <button onClick={logout} className="px-3 py-2 rounded-lg text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 md:p-10 grid gap-8 md:grid-cols-2">
        <section className="rounded-3xl border border-slate-800 bg-[#111113] p-6">
          <h2 className="text-lg font-bold">Create Live Class</h2>
          <p className="text-xs text-slate-500 mt-1">Join link + meeting credentials will be generated automatically if left blank.</p>

          <form onSubmit={createClass} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Class name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Subject</label>
                <input
                  required
                  value={form.subject}
                  onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Start date & time</label>
                <input
                  required
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) => setForm((p) => ({ ...p, startAt: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Duration (minutes)</label>
                <input
                  required
                  inputMode="numeric"
                  value={form.durationMinutes}
                  onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value.replace(/[^0-9]/g, "") }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Meeting ID (optional)</label>
                <input
                  value={form.meetingId}
                  onChange={(e) => setForm((p) => ({ ...p, meetingId: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Meeting password (optional)</label>
                <input
                  value={form.meetingPassword}
                  onChange={(e) => setForm((p) => ({ ...p, meetingPassword: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium text-center">{error}</div>}

            <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20">
              Create class
            </button>

            {createdInfo && (
              <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-600/10 space-y-2">
                <div className="text-xs font-bold text-indigo-300">Share with students</div>
                <div className="text-xs text-slate-200 break-all">
                  <div>
                    <span className="text-slate-400">Join link:</span> {createdInfo.joinLink}
                  </div>
                  <div>
                    <span className="text-slate-400">Meeting ID:</span> {createdInfo.meetingId}
                  </div>
                  <div>
                    <span className="text-slate-400">Password:</span> {createdInfo.meetingPassword}
                  </div>
                </div>
              </div>
            )}
          </form>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-[#111113] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Live Classes</h2>
            <button
              onClick={load}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 hover:border-indigo-500/50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="mt-6 text-sm text-slate-500">Loading...</div>
          ) : classes.length === 0 ? (
            <div className="mt-6 text-sm text-slate-500">No classes yet.</div>
          ) : (
            <div className="mt-6 space-y-3">
              {classes.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-bold truncate">{c.name}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {c.subject} • {new Date(c.startAt).toLocaleString()} • {c.durationMinutes} min
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Meeting ID <span className="text-slate-200 font-semibold">{c.meetingId}</span> • Participants{" "}
                        <span className="text-slate-200 font-semibold">{c.participantCount ?? 0}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 break-all">
                        Join link: <a className="text-indigo-400 hover:underline" href={`/meet/${c.joinSlug}`}>{`${window.location.origin}/meet/${c.joinSlug}`}</a>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">{c.status}</div>
                      <a
                        className="px-3 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white text-center"
                        href={`/meet/${c.joinSlug}`}
                      >
                        Host
                      </a>
                      {c.status !== "live" ? (
                        <button onClick={() => startClass(c.id)} className="px-3 py-2 rounded-lg text-xs font-bold bg-emerald-600/20 border border-emerald-500/30 text-emerald-300">
                          Start
                        </button>
                      ) : (
                        <button onClick={() => endClass(c.id)} className="px-3 py-2 rounded-lg text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400">
                          End
                        </button>
                      )}
                      {c.status === "ended" && (
                        <button onClick={() => deleteClass(c.id)} className="px-3 py-2 rounded-lg text-xs font-bold bg-slate-700/50 border border-slate-600/50 text-slate-300 hover:bg-slate-700">
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

