import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import Peer from "simple-peer";
import { apiFetch } from "./api";

type Participant = { socketId: string; userId: string; name: string; role: "admin" | "student" };

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
};

function parseJwt(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export default function MeetingRoomPage() {
  const { joinSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [liveClass, setLiveClass] = useState<LiveClass | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantCount, setParticipantCount] = useState(0);

  const [meetingPassword, setMeetingPassword] = useState(searchParams.get("meetingPassword") || "");
  const [meetingId, setMeetingId] = useState(searchParams.get("meetingId") || "");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState<Array<{ id: string; from: { name: string; role: string }; message: string; ts: number }>>([]);

  const [aiQ, setAiQ] = useState("");
  const [aiA, setAiA] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, Peer.Instance>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const [remoteTiles, setRemoteTiles] = useState<Array<{ socketId: string; stream: MediaStream }>>([]);

  const socket: Socket | null = useMemo(() => io({ autoConnect: false }), []);

  const token = localStorage.getItem("ss_token") || "";
  const tokenPayload = parseJwt(token);
  const role = tokenPayload?.role === "admin" ? "admin" : "student";
  const currentUserName = typeof tokenPayload?.name === "string" && tokenPayload.name.trim() ? tokenPayload.name : "You";

  const rebuildRemoteTiles = () => {
    setRemoteTiles(Array.from(remoteStreamsRef.current.entries()).map(([socketId, stream]) => ({ socketId, stream })));
  };

  const destroyAllPeers = () => {
    for (const p of peersRef.current.values()) p.destroy();
    peersRef.current.clear();
    remoteStreamsRef.current.clear();
    rebuildRemoteTiles();
  };

  const stopLocalStream = () => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
  };

  const createPeer = (targetSocketId: string, initiator: boolean) => {
    const stream = localStreamRef.current!;
    const peer = new Peer({
      initiator,
      trickle: true,
      stream,
    });

    peer.on("signal", (data) => {
      socket?.emit("webrtc:signal", { to: targetSocketId, data });
    });

    peer.on("stream", (remoteStream) => {
      remoteStreamsRef.current.set(targetSocketId, remoteStream);
      rebuildRemoteTiles();
    });

    peer.on("close", () => {
      remoteStreamsRef.current.delete(targetSocketId);
      peersRef.current.delete(targetSocketId);
      rebuildRemoteTiles();
    });

    peer.on("error", () => {
      
    });

    peersRef.current.set(targetSocketId, peer);
    return peer;
  };

  const acquireMedia = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    setMicOn(true);
    setCamOn(true);
  };

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [liveClass]);

  const joinRoom = async () => {
    setJoining(true);
    setJoinError(null);
    setAiA(null);
    try {
      if (!token) throw new Error("Not authenticated");
      if (!joinSlug && !meetingId) throw new Error("Missing join link or meeting ID");

      const joinPayload: any = joinSlug ? { joinSlug } : { meetingId };
      
      
      if (role !== "admin" && meetingPassword.trim()) {
        joinPayload.meetingPassword = meetingPassword.trim();
      } else if (role === "admin" && meetingPassword.trim()) {
        
        joinPayload.meetingPassword = meetingPassword.trim();
      }

      const joinRes = await apiFetch<{ roomToken: string; isHost: boolean; passwordRequired: boolean; liveClass: LiveClass }>("/api/live-classes/join", {
        method: "POST",
        body: JSON.stringify(joinPayload),
      });

      
      if (joinRes.passwordRequired && !meetingPassword.trim() && role !== "admin") {
        setPasswordRequired(true);
        setJoinError("Please enter the meeting password");
        setJoining(false);
        return;
      }

      setLiveClass(joinRes.liveClass);
      setIsHost(joinRes.isHost);

      await acquireMedia();

      socket?.connect();
      socket?.emit("room:join", { roomToken: joinRes.roomToken });

      socket?.once("room:error", (p: any) => {
        setJoinError(p?.error || "Join failed");
      });
    } catch (err: any) {
      
      if (err?.message && err.message.includes("password required")) {
        setPasswordRequired(true);
      }
      setJoinError(err?.message || "Join failed");
      stopLocalStream();
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const onRoomState = (payload: { classId: string; selfSocketId: string; participants: Participant[] }) => {
      setParticipants(payload.participants);
      setParticipantCount(payload.participants.length);

      
      for (const p of payload.participants) {
        if (p.socketId === payload.selfSocketId) continue;
        if (peersRef.current.has(p.socketId)) continue;
        createPeer(p.socketId, true);
      }
    };

    const onParticipants = (payload: { participantCount: number; participants: Participant[] }) => {
      setParticipantCount(payload.participantCount);
      setParticipants(payload.participants);
    };

    const onSignal = (payload: { from: string; data: any }) => {
      let peer = peersRef.current.get(payload.from);
      if (!peer) peer = createPeer(payload.from, false);
      peer.signal(payload.data);
    };

    const onUserLeft = (payload: { socketId: string }) => {
      const peer = peersRef.current.get(payload.socketId);
      peer?.destroy();
      peersRef.current.delete(payload.socketId);
      remoteStreamsRef.current.delete(payload.socketId);
      rebuildRemoteTiles();
    };

    const onChat = (payload: any) => {
      setChat((prev) => [...prev, { id: payload.id, from: payload.from, message: payload.message, ts: payload.ts }]);
    };

    const onHostMute = () => {
      const s = localStreamRef.current;
      const t = s?.getAudioTracks?.()[0];
      if (t) t.enabled = false;
      setMicOn(false);
    };

    const onHostKick = () => {
      alert("You were removed by the host.");
      navigate("/dashboard", { replace: true });
    };

    socket.on("room:state", onRoomState);
    socket.on("room:participants", onParticipants);
    socket.on("webrtc:signal", onSignal);
    socket.on("room:user-left", onUserLeft);
    socket.on("chat:message", onChat);
    socket.on("host:mute", onHostMute);
    socket.on("host:kick", onHostKick);

    return () => {
      socket.off("room:state", onRoomState);
      socket.off("room:participants", onParticipants);
      socket.off("webrtc:signal", onSignal);
      socket.off("room:user-left", onUserLeft);
      socket.off("chat:message", onChat);
      socket.off("host:mute", onHostMute);
      socket.off("host:kick", onHostKick);
    };
  }, [navigate, socket]);

  useEffect(() => {
    return () => {
      destroyAllPeers();
      socket?.disconnect();
      stopLocalStream();
    };
    
  }, []);

  const toggleMic = () => {
    const s = localStreamRef.current;
    const t = s?.getAudioTracks?.()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    setMicOn(t.enabled);
  };

  const toggleCam = () => {
    const s = localStreamRef.current;
    const t = s?.getVideoTracks?.()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    setCamOn(t.enabled);
  };

  const startShare = async () => {
    if (sharing) return;
    const local = localStreamRef.current;
    if (!local) return;
    const oldVideo = local.getVideoTracks()[0];
    if (!oldVideo) return;

    const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const newVideo = display.getVideoTracks()[0];
    if (!newVideo) return;

    setSharing(true);
    newVideo.onended = () => {
      for (const peer of peersRef.current.values()) {
        try {
          peer.replaceTrack(newVideo, oldVideo, local);
        } catch {}
      }
      local.removeTrack(newVideo);
      local.addTrack(oldVideo);
      setSharing(false);
    };

    for (const peer of peersRef.current.values()) {
      try {
        peer.replaceTrack(oldVideo, newVideo, local);
      } catch {}
    }

    local.removeTrack(oldVideo);
    local.addTrack(newVideo);
    if (localVideoRef.current) localVideoRef.current.srcObject = local;
  };

  const sendChat = () => {
    const msg = chatInput.trim();
    if (!msg) return;
    socket?.emit("chat:send", { message: msg });
    setChatInput("");
  };

  const askAI = async () => {
    const q = aiQ.trim();
    if (!q) return;
    setAiLoading(true);
    setAiA(null);
    try {
      const subject = liveClass?.subject ? `Subject: ${liveClass.subject}.` : "";
      const className = liveClass?.name ? `Class: ${liveClass.name}.` : "";
      const prompt = `You are a helpful live-class assistant for students. ${subject} ${className}\n\nStudent question: ${q}`;
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ model: "gemini-3-flash-preview", contents: prompt, sessionId: `live-${liveClass?.id || "unknown"}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "AI failed");
      setAiA(data.text || "No response.");
    } catch (e: any) {
      setAiA(`Error: ${e?.message || "AI failed"}`);
    } finally {
      setAiLoading(false);
    }
  };

  const hostMute = (targetSocketId: string) => socket?.emit("host:mute", { targetSocketId });
  const hostKick = (targetSocketId: string) => socket?.emit("host:kick", { targetSocketId });

  const leave = () => {
    destroyAllPeers();
    socket?.disconnect();
    stopLocalStream();
    navigate(role === "admin" ? "/admin" : "/dashboard", { replace: true });
  };

  if (!liveClass) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-[#111113] p-8">
          <h1 className="text-2xl font-bold tracking-tight">Join Live Class</h1>
          <p className="text-sm text-slate-500 mt-1">{passwordRequired ? "Enter the meeting password to join." : "Enter your meeting details."}</p>

          {!joinSlug && (
            <div className="mt-6 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Meeting ID</label>
              <input
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
                placeholder="Meeting ID"
                className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {(passwordRequired || meetingPassword) && role !== "admin" && (
            <div className="mt-4 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Password</label>
              <input
                value={meetingPassword}
                onChange={(e) => setMeetingPassword(e.target.value)}
                placeholder="Meeting password"
                className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {joinError && <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium text-center">{joinError}</div>}

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => (window.location.href = role === "admin" ? "/admin" : "/dashboard")}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 hover:border-indigo-500/50 text-sm font-bold"
            >
              Back
            </button>
            <button
              disabled={joining}
              onClick={joinRoom}
              className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-sm font-bold"
            >
              {joining ? "Joining..." : "Join"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col">
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-[#0A0A0B]/80 backdrop-blur-md">
        <div className="min-w-0">
          <div className="text-sm font-bold truncate">
            {liveClass.name} <span className="text-slate-500 font-medium">• {liveClass.subject}</span>
          </div>
          <div className="text-xs text-slate-500">
            Participants: <span className="text-slate-200 font-semibold">{participantCount}</span> {isHost ? "• Host" : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleMic} className={`px-3 py-2 rounded-lg text-xs font-bold border ${micOn ? "bg-slate-900 border-slate-800" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
            {micOn ? "Mic On" : "Mic Off"}
          </button>
          <button onClick={toggleCam} className={`px-3 py-2 rounded-lg text-xs font-bold border ${camOn ? "bg-slate-900 border-slate-800" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
            {camOn ? "Cam On" : "Cam Off"}
          </button>
          <button onClick={startShare} className={`px-3 py-2 rounded-lg text-xs font-bold border ${sharing ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-slate-900 border-slate-800"}`}>
            {sharing ? "Sharing" : "Share Screen"}
          </button>
          <button onClick={leave} className="px-3 py-2 rounded-lg text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400">
            Leave
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px_320px] gap-4 p-4">
        <section className="rounded-3xl border border-slate-800 bg-[#111113] p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full aspect-video bg-black" />
              <div className="p-3 text-xs text-slate-400">
                {currentUserName} <span className="text-slate-500">({role})</span>
              </div>
            </div>
            {remoteTiles.map((t) => (
              <RemoteTile key={t.socketId} socketId={t.socketId} stream={t.stream} label={participants.find((p) => p.socketId === t.socketId)?.name || "Participant"} />
            ))}
          </div>
        </section>

        <aside className="rounded-3xl border border-slate-800 bg-[#111113] p-4 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400">Participants</h3>
            <div className="text-xs text-slate-500">{participantCount}</div>
          </div>
          <div className="mt-4 space-y-2 overflow-y-auto">
            {participants.map((p) => (
              <div key={p.socketId} className="p-3 rounded-2xl border border-slate-800 bg-slate-900/40 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {p.role === "admin" ? (
                      <span className="text-indigo-400">🔐 {p.name || "Admin"}</span>
                    ) : (
                      <>
                        {p.name} <span className="text-xs text-slate-500">(student)</span>
                      </>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-600 truncate">{p.socketId}</div>
                </div>
                {isHost && p.socketId !== socket?.id && (
                  <div className="flex gap-1">
                    <button onClick={() => hostMute(p.socketId)} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-900 border border-slate-800 hover:border-indigo-500/50">
                      Mute
                    </button>
                    <button onClick={() => hostKick(p.socketId)} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-500/10 border border-red-500/20 text-red-300">
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        <aside className="rounded-3xl border border-slate-800 bg-[#111113] p-4 flex flex-col gap-4">
          <div className="flex-1 flex flex-col">
            <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400">Live Chat</h3>
            <div className="mt-4 flex-1 overflow-y-auto space-y-2">
              {chat.map((m) => (
                <div key={m.id} className="p-3 rounded-2xl border border-slate-800 bg-slate-900/40">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    {m.from.role === "admin" ? (
                      <span className="text-indigo-400">🔐 Admin</span>
                    ) : (
                      <>
                        {m.from.name}
                      </>
                    )}
                    {" "}• {new Date(m.ts).toLocaleTimeString()}
                  </div>
                  <div className="text-sm mt-1 whitespace-pre-wrap">{m.message}</div>
                </div>
              ))}
              {chat.length === 0 && <div className="text-sm text-slate-500">No messages yet.</div>}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 outline-none focus:border-indigo-500"
              />
              <button onClick={sendChat} className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold">
                Send
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400">AI Assistant</h3>
            <p className="text-xs text-slate-500 mt-1">Ask questions during the class.</p>
            <div className="mt-3 flex gap-2">
              <input
                value={aiQ}
                onChange={(e) => setAiQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askAI()}
                placeholder="Ask the AI..."
                className="flex-1 px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 outline-none focus:border-indigo-500"
              />
              <button onClick={askAI} disabled={aiLoading} className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 font-bold">
                {aiLoading ? "..." : "Ask"}
              </button>
            </div>
            {aiA && <div className="mt-3 p-3 rounded-2xl border border-slate-800 bg-slate-900/40 text-sm whitespace-pre-wrap">{aiA}</div>}
          </div>
        </aside>
      </div>
    </div>
  );
}

function RemoteTile({ socketId, stream, label }: { socketId: string; stream: MediaStream; label: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
      <video ref={ref} autoPlay playsInline className="w-full aspect-video bg-black" />
      <div className="p-3 text-xs text-slate-400 truncate" title={socketId}>
        {label}
      </div>
    </div>
  );
}

