import 'dotenv/config';
import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer as createHttpServer } from "http";
import { MongoClient, Db, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { Server as SocketIOServer } from "socket.io";
import { MongoMemoryServer } from "mongodb-memory-server";
import { mkdir } from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));


const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = "smart_solver";
let db: Db;

let mongoClient = new MongoClient(MONGODB_URI);
let memoryMongo: MongoMemoryServer | undefined;

type UserRole = "admin" | "student";
type JwtPayload = { id: string; email: string; name: string; role: UserRole };
type RoomJwtPayload = { purpose: "live_room"; classId: string; userId: string; role: UserRole; name: string };

async function initializeDB() {
  try {
    await mongoClient.connect();
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("MongoDB connection error:", err);
      throw err;
    }

    console.warn("Configured MongoDB is unavailable; starting local development database.");
    await mongoClient.close();
    const localMongoPath = path.join(__dirname, ".mongo-data");
    await mkdir(localMongoPath, { recursive: true });
    try {
      memoryMongo = await MongoMemoryServer.create({
        instance: { dbPath: localMongoPath },
      });
    } catch {
      const isolatedMongoPath = `${localMongoPath}-${process.pid}`;
      console.warn("Local development database is already in use; starting an isolated instance.");
      await mkdir(isolatedMongoPath, { recursive: true });
      memoryMongo = await MongoMemoryServer.create({
        instance: { dbPath: isolatedMongoPath },
      });
    }
    mongoClient = new MongoClient(memoryMongo.getUri());
    await mongoClient.connect();
  }

  db = mongoClient.db(DB_NAME);
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("sessions").createIndex({ user_id: 1, created_at: -1 });
  await db.collection("messages").createIndex({ session_id: 1, timestamp: 1 });
  await db.collection("live_classes").createIndex({ meetingId: 1 }, { unique: true });
  await db.collection("live_classes").createIndex({ joinSlug: 1 }, { unique: true });
  await db.collection("live_classes").createIndex({ startAt: 1 });

  console.log("MongoDB connected and initialized");
}

const app = express();
let PORT = parseInt(process.env.PORT || "3000");
const JWT_SECRET = process.env.JWT_SECRET || "smart-solver-secret-key";
const liveParticipantCounts = new Map<string, number>(); 

app.use(express.json({ limit: '50mb' }));


const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded as JwtPayload;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};


app.post("/api/auth/signup", async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.collection("users").insertOne({
      email,
      password: hashedPassword,
      name,
      role: "student" as UserRole,
      loginCount: 0,
      firstLoginAt: null,
      created_at: new Date()
    });
    const token = jwt.sign({ id: result.insertedId.toString(), email, name, role: "student" as UserRole }, JWT_SECRET);
    res.json({ token, user: { email, name, role: "student" as UserRole } });
  } catch (err) {
    res.status(400).json({ error: "User already exists" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await db.collection("users").findOne({ email }) as any;
  
  if (!user) {
    return res.status(404).json({ error: "User not found. Please sign up first." });
  }

  if (!(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid password. Please try again." });
  }

  const role: UserRole = (user.role === "admin" ? "admin" : "student");
  const loginCount = typeof user.loginCount === "number" ? user.loginCount : 0;
  const isFirstLogin = loginCount === 0;
  const loginUpdate: any = { $inc: { loginCount: 1 } };
  if (isFirstLogin) {
    loginUpdate.$set = { firstLoginAt: new Date() };
  }
  
  await db.collection("users").updateOne({ _id: user._id }, loginUpdate);

  const token = jwt.sign({ id: user._id.toString(), email: user.email, name: user.name, role }, JWT_SECRET);
  res.json({ token, user: { email: user.email, name: user.name, role }, isFirstLogin });
});

app.post("/api/admin/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await db.collection("users").findOne({ email }) as any;
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.role !== "admin") return res.status(403).json({ error: "Not an admin account" });
  if (!(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid password. Please try again." });
  }

  const loginCount = typeof user.loginCount === "number" ? user.loginCount : 0;
  const isFirstLogin = loginCount === 0;
  const loginUpdate: any = { $inc: { loginCount: 1 } };
  if (isFirstLogin) {
    loginUpdate.$set = { firstLoginAt: new Date() };
  }
  await db.collection("users").updateOne({ _id: user._id }, loginUpdate);

  const token = jwt.sign({ id: user._id.toString(), email: user.email, name: user.name, role: "admin" as UserRole }, JWT_SECRET);
  res.json({ token, user: { email: user.email, name: user.name, role: "admin" as UserRole }, isFirstLogin });
});

app.get("/api/me", authenticate, async (req: any, res) => {
  try {
    const userDoc = await db.collection("users").findOne({ _id: new ObjectId(req.user.id) }) as any;
    const loginCount = typeof userDoc?.loginCount === "number" ? userDoc.loginCount : 0;
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        loginCount
      }
    });
  } catch (err) {
    
    res.json({
      user: { id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role, loginCount: 0 }
    });
  }
});


app.get("/api/sessions", authenticate, async (req: any, res) => {
  try {
    const userId = new ObjectId(req.user.id);
    const sessions = await db.collection("sessions")
      .find({ user_id: userId })
      .sort({ is_pinned: -1, created_at: -1 })
      .toArray();
    res.json(sessions.map(s => ({
      ...s,
      id: s._id.toString(),
      user_id: s.user_id.toString(),
      is_pinned: s.is_pinned ? 1 : 0
    })));
  } catch (err) {
    console.error("Error fetching sessions:", err);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

app.post("/api/sessions", authenticate, async (req: any, res) => {
  try {
    const { id, title } = req.body;
    const userId = new ObjectId(req.user.id);
    await db.collection("sessions").insertOne({
      _id: id,
      user_id: userId,
      title,
      is_pinned: false,
      created_at: new Date()
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Error creating session:", err);
    res.status(500).json({ error: "Failed to create session" });
  }
});

app.put("/api/sessions/:id", authenticate, async (req: any, res) => {
  try {
    const { title, is_pinned } = req.body;
    const userId = new ObjectId(req.user.id);
    const updateData: any = {};
    
    if (title !== undefined) updateData.title = title;
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned ? true : false;
    
    await db.collection("sessions").updateOne(
      { _id: req.params.id, user_id: userId },
      { $set: updateData }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating session:", err);
    res.status(500).json({ error: "Failed to update session" });
  }
});

app.delete("/api/sessions/:id", authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = new ObjectId(req.user.id);
    
    
    await db.collection("messages").deleteMany({ session_id: id });
    
    
    const result = await db.collection("sessions").deleteOne({ _id: id, user_id: userId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Session not found or unauthorized" });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete session:", err);
    res.status(500).json({ error: "Failed to delete session" });
  }
});

app.get("/api/messages/:sessionId", authenticate, async (req, res) => {
  try {
    const messages = await db.collection("messages")
      .find({ session_id: req.params.sessionId })
      .sort({ timestamp: 1 })
      .toArray();
    res.json(messages.map(m => ({
      ...m,
      id: m._id.toString()
    })));
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.post("/api/messages", authenticate, async (req, res) => {
  try {
    const { sessionId, role, content, image } = req.body;
    await db.collection("messages").insertOne({
      session_id: sessionId,
      role,
      content,
      image: image || null,
      timestamp: new Date()
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Error saving message:", err);
    res.status(500).json({ error: "Failed to save message" });
  }
});

app.delete("/api/sessions", authenticate, async (req: any, res) => {
  try {
    const userId = new ObjectId(req.user.id);
    
    
    const sessions = await db.collection("sessions")
      .find({ user_id: userId })
      .toArray();
    
    const sessionIds = sessions.map(s => s._id);
    
    
    await db.collection("messages").deleteMany({ session_id: { $in: sessionIds } });
    
    
    await db.collection("sessions").deleteMany({ user_id: userId });
    
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to clear history:", err);
    res.status(500).json({ error: "Failed to clear history" });
  }
});

function randomSlug(bytes = 9) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function randomMeetingId() {
  
  return String(Math.floor(100_000_000 + Math.random() * 900_000_000));
}

function randomMeetingPassword() {
  return crypto.randomBytes(5).toString("base64url"); 
}

function liveJoinLink(req: any, joinSlug: string) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}/meet/${joinSlug}`;
}

app.post("/api/admin/live-classes", authenticate, requireAdmin, async (req: any, res) => {
  try {
    const { name, subject, startAt, durationMinutes, meetingId, meetingPassword } = req.body;
    console.log("[CREATE CLASS] Request from", req.user.email, ":", { name, subject, startAt, durationMinutes });
    
    if (!name || !subject || !startAt || !durationMinutes) {
      console.warn("[CREATE CLASS] Missing fields");
      return res.status(400).json({ error: "Missing required fields" });
    }

    const joinSlug = randomSlug(10);
    const finalMeetingId = meetingId || randomMeetingId();
    
    let plainPassword = "";
    let passwordHash = "";
    if (typeof meetingPassword === "string" && meetingPassword.trim()) {
      plainPassword = meetingPassword.trim();
      passwordHash = await bcrypt.hash(plainPassword, 10);
    }

    const doc = {
      name,
      subject,
      startAt: new Date(startAt),
      durationMinutes: Number(durationMinutes),
      meetingId: finalMeetingId,
      meetingPasswordHash: passwordHash || null,
      joinSlug,
      status: "scheduled" as "scheduled" | "live" | "ended",
      createdBy: new ObjectId(req.user.id),
      createdAt: new Date(),
      startedAt: null,
      endedAt: null
    };

    const result = await db.collection("live_classes").insertOne(doc);
    console.log("[CREATE CLASS] Saved to DB:", { id: result.insertedId, joinSlug, meetingId: finalMeetingId });

    res.json({
      liveClass: {
        id: result.insertedId.toString(),
        name: doc.name,
        subject: doc.subject,
        startAt: doc.startAt,
        durationMinutes: doc.durationMinutes,
        meetingId: doc.meetingId,
        joinSlug: doc.joinSlug,
        status: doc.status
      },
      joinLink: liveJoinLink(req, joinSlug),
      meetingId: finalMeetingId,
      meetingPassword: plainPassword
    });
  } catch (err: any) {
    const msg = String(err?.message || err);
    console.error("[CREATE CLASS] Error:", msg);
    if (msg.includes("E11000")) return res.status(409).json({ error: "Meeting ID / join link collision. Please retry." });
    res.status(500).json({ error: "Failed to create live class" });
  }
});

app.get("/api/admin/live-classes", authenticate, requireAdmin, async (req: any, res) => {
  try {
    const items = await db.collection("live_classes").find({}).sort({ createdAt: -1 }).toArray() as any[];
    res.json(items.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      subject: c.subject,
      startAt: c.startAt,
      durationMinutes: c.durationMinutes,
      meetingId: c.meetingId,
      joinSlug: c.joinSlug,
      status: c.status,
      createdAt: c.createdAt,
      startedAt: c.startedAt,
      endedAt: c.endedAt
    })));
  } catch (err) {
    console.error("Admin list classes error:", err);
    res.status(500).json({ error: "Failed to load classes" });
  }
});

app.patch("/api/admin/live-classes/:id", authenticate, requireAdmin, async (req: any, res) => {
  try {
    const { name, subject, startAt, durationMinutes } = req.body;
    const update: any = {};
    if (name !== undefined) update.name = name;
    if (subject !== undefined) update.subject = subject;
    if (startAt !== undefined) update.startAt = new Date(startAt);
    if (durationMinutes !== undefined) update.durationMinutes = Number(durationMinutes);

    await db.collection("live_classes").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: update }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Admin update class error:", err);
    res.status(500).json({ error: "Failed to update class" });
  }
});

app.post("/api/admin/live-classes/:id/start", authenticate, requireAdmin, async (req: any, res) => {
  try {
    await db.collection("live_classes").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: "live", startedAt: new Date() } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Start class error:", err);
    res.status(500).json({ error: "Failed to start class" });
  }
});

app.post("/api/admin/live-classes/:id/end", authenticate, requireAdmin, async (req: any, res) => {
  try {
    await db.collection("live_classes").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: "ended", endedAt: new Date() } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("End class error:", err);
    res.status(500).json({ error: "Failed to end class" });
  }
});

app.delete("/api/admin/live-classes/:id", authenticate, requireAdmin, async (req: any, res) => {
  try {
    const result = await db.collection("live_classes").deleteOne(
      { _id: new ObjectId(req.params.id) }
    );
    if (result.deletedCount === 0) return res.status(404).json({ error: "Class not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete class error:", err);
    res.status(500).json({ error: "Failed to delete class" });
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) return res.status(400).json({ error: "Email and new password required" });
  try {
    const user = await db.collection("users").findOne({ email }) as any;
    if (!user) return res.status(404).json({ error: "User not found" });
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );
    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});


app.get("/api/live-classes", authenticate, async (req: any, res) => {
  try {
    const now = new Date();
    const items = await db.collection("live_classes")
      .find({ status: { $ne: "ended" } })
      .sort({ startAt: 1 })
      .toArray() as any[];

    
    res.json(items.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      subject: c.subject,
      startAt: c.startAt,
      durationMinutes: c.durationMinutes,
      meetingId: c.meetingId,
      joinSlug: c.joinSlug,
      status: c.status,
      joinLink: liveJoinLink(req, c.joinSlug),
      participantCount: liveParticipantCounts.get(c._id.toString()) || 0,
      isUpcoming: c.startAt ? new Date(c.startAt).getTime() > now.getTime() : false
    })));
  } catch (err) {
    console.error("List live classes error:", err);
    res.status(500).json({ error: "Failed to load live classes" });
  }
});

app.post("/api/live-classes/join", authenticate, async (req: any, res) => {
  try {
    let { joinSlug, meetingId, meetingPassword } = req.body as { joinSlug?: string; meetingId?: string; meetingPassword?: string };
    joinSlug = typeof joinSlug === "string" ? decodeURIComponent(joinSlug).trim() : "";
    meetingId = typeof meetingId === "string" ? meetingId.trim() : "";

    console.log("[JOIN] Incoming request:", { joinSlug, meetingId, role: req.user.role, userEmail: req.user.email });

    if (!joinSlug && !meetingId) return res.status(400).json({ error: "Provide joinSlug or meetingId" });

    let liveClass: any = null;

    
    if (joinSlug) {
      console.log("[JOIN] Trying exact joinSlug match:", joinSlug);
      liveClass = await db.collection("live_classes").findOne({ joinSlug }) as any;
      if (liveClass) console.log("[JOIN] Found by joinSlug:", liveClass._id);
    }

    
    if (!liveClass && joinSlug && /^\d+$/.test(joinSlug)) {
      console.log("[JOIN] joinSlug is numeric, trying as meetingId:", joinSlug);
      liveClass = await db.collection("live_classes").findOne({ meetingId: joinSlug }) as any;
      if (liveClass) console.log("[JOIN] Found by meetingId (from joinSlug):", liveClass._id);
    }

    if (!liveClass && meetingId) {
      console.log("[JOIN] Trying exact meetingId match:", meetingId);
      liveClass = await db.collection("live_classes").findOne({ meetingId }) as any;
      if (liveClass) console.log("[JOIN] Found by meetingId:", liveClass._id);
    }

    
    if (!liveClass && joinSlug) {
      console.log("[JOIN] Trying case-insensitive joinSlug:", joinSlug);
      liveClass = await db.collection("live_classes").findOne({ joinSlug: new RegExp(`^${joinSlug}$`, "i") }) as any;
      if (liveClass) console.log("[JOIN] Found by case-insensitive slug:", liveClass._id);
    }

    if (!liveClass) {
      
      const allClasses = await db.collection("live_classes").find({ status: { $ne: "ended" } }).toArray() as any[];
      console.warn("[JOIN] Class not found. Available classes:", allClasses.map(c => ({ id: c._id, name: c.name, joinSlug: c.joinSlug, meetingId: c.meetingId, status: c.status })));
      return res.status(404).json({ error: "Class not found" });
    }

    if (liveClass.status === "ended") {
      console.warn("[JOIN] Class is ended:", liveClass._id);
      return res.status(410).json({ error: "Class ended" });
    }

    const isAdmin = req.user.role === "admin";
    const isHost = isAdmin && String(liveClass.createdBy) === String(req.user.id);

    
    if (isAdmin && !isHost) {
      return res.status(403).json({ error: "Only the host can join this meeting as admin" });
    }

    
    if (!isHost) {
      const passwordIsRequired = !!(liveClass.meetingPasswordHash);
      if (passwordIsRequired) {
        if (!meetingPassword) return res.status(400).json({ error: "Meeting password required" });
        const ok = await bcrypt.compare(meetingPassword, liveClass.meetingPasswordHash);
        if (!ok) {
          console.warn("[JOIN] Invalid password for class:", liveClass._id);
          return res.status(401).json({ error: "Invalid meeting password" });
        }
      }
    }

    console.log("[JOIN] Success for user", req.user.email, "class", liveClass._id);

    const roomToken = jwt.sign(
      {
        purpose: "live_room",
        classId: liveClass._id.toString(),
        userId: req.user.id,
        role: req.user.role,
        name: req.user.name
      } satisfies RoomJwtPayload,
      JWT_SECRET,
      { expiresIn: "6h" }
    );

    res.json({
      roomToken,
      isHost,
      passwordRequired: !isHost && !!(liveClass.meetingPasswordHash),
      liveClass: {
        id: liveClass._id.toString(),
        name: liveClass.name,
        subject: liveClass.subject,
        startAt: liveClass.startAt,
        durationMinutes: liveClass.durationMinutes,
        meetingId: liveClass.meetingId,
        joinSlug: liveClass.joinSlug,
        status: liveClass.status,
        joinLink: liveJoinLink(req, liveClass.joinSlug)
      }
    });
  } catch (err) {
    console.error("Join class error:", err);
    res.status(500).json({ error: "Failed to join class" });
  }
});

async function startServer() {
  await initializeDB();

  
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const existing = await db.collection("users").findOne({ email: adminEmail }) as any;
    const hashed = await bcrypt.hash(adminPassword, 10);
    if (!existing) {
      await db.collection("users").insertOne({ email: adminEmail, password: hashed, name: "Admin", role: "admin", created_at: new Date() });
      console.log("✓ Seeded admin user from env");
    } else if (existing.role !== "admin") {
      await db.collection("users").updateOne({ _id: existing._id }, { $set: { role: "admin" } });
      console.log("✓ Promoted existing user to admin from env");
    }
  }

  
  const allClasses = await db.collection("live_classes").find({}).toArray() as any[];
  console.log(`[STARTUP] Total classes in DB: ${allClasses.length}`, allClasses.map(c => ({ id: c._id, name: c.name, joinSlug: c.joinSlug, meetingId: c.meetingId, status: c.status })));
  
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
  }

  const httpServer = createHttpServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: true, credentials: true },
    transports: ["polling"]  
  });

  
  io.on("error", (err: any) => {
    console.warn("Socket.IO error:", err?.code || err?.message || err);
  });

  type Participant = { socketId: string; userId: string; name: string; role: UserRole; joinedAt: number };
  const roomParticipants = new Map<string, Map<string, Participant>>(); 

  const getCount = (classId: string) => roomParticipants.get(classId)?.size || 0;
  const emitClassCount = (classId: string) => {
    const c = getCount(classId);
    liveParticipantCounts.set(classId, c);
    io.emit("classes:update", { classId, participantCount: c });
  };

  io.on("connection", (socket) => {
    let currentRoom: { classId: string; userId: string; role: UserRole; name: string } | null = null;

    socket.on("room:join", async (payload: { roomToken: string }) => {
      try {
        const decoded = jwt.verify(payload.roomToken, JWT_SECRET) as RoomJwtPayload;
        if (decoded.purpose !== "live_room") return socket.emit("room:error", { error: "Invalid room token" });

        const classId = decoded.classId;
        currentRoom = { classId, userId: decoded.userId, role: decoded.role, name: decoded.name };
        socket.join(classId);

        if (!roomParticipants.has(classId)) roomParticipants.set(classId, new Map());
        const classMap = roomParticipants.get(classId)!;
        
        for (const [existingSocketId, existing] of classMap.entries()) {
          if (existing.userId === decoded.userId && existingSocketId !== socket.id) {
            classMap.delete(existingSocketId);
            const oldSocket = io.sockets.sockets.get(existingSocketId);
            oldSocket?.disconnect(true);
          }
        }
        classMap.set(socket.id, { socketId: socket.id, userId: decoded.userId, name: decoded.name, role: decoded.role, joinedAt: Date.now() });

        const participants = Array.from(roomParticipants.get(classId)!.values()).map((p) => ({
          socketId: p.socketId,
          userId: p.userId,
          name: p.name,
          role: p.role
        }));

        socket.emit("room:state", { classId, selfSocketId: socket.id, participants });
        socket.to(classId).emit("room:user-joined", { socketId: socket.id, userId: decoded.userId, name: decoded.name, role: decoded.role });
        io.to(classId).emit("room:participants", { participantCount: getCount(classId), participants });
        emitClassCount(classId);
      } catch (err) {
        socket.emit("room:error", { error: "Join failed" });
      }
    });

    socket.on("webrtc:signal", (payload: { to: string; data: any }) => {
      if (!currentRoom) return;
      io.to(payload.to).emit("webrtc:signal", { from: socket.id, data: payload.data });
    });

    socket.on("chat:send", (payload: { message: string }) => {
      if (!currentRoom) return;
      io.to(currentRoom.classId).emit("chat:message", {
        id: crypto.randomUUID(),
        from: { socketId: socket.id, userId: currentRoom.userId, name: currentRoom.name, role: currentRoom.role },
        message: String(payload.message || "").slice(0, 4000),
        ts: Date.now()
      });
    });

    socket.on("host:mute", (payload: { targetSocketId: string }) => {
      if (!currentRoom || currentRoom.role !== "admin") return;
      io.to(payload.targetSocketId).emit("host:mute");
    });

    socket.on("host:kick", (payload: { targetSocketId: string }) => {
      if (!currentRoom || currentRoom.role !== "admin") return;
      io.to(payload.targetSocketId).emit("host:kick");
      const target = io.sockets.sockets.get(payload.targetSocketId);
      target?.disconnect(true);
    });

    socket.on("disconnect", () => {
      if (!currentRoom) return;
      const { classId } = currentRoom;
      const map = roomParticipants.get(classId);
      if (map) {
        map.delete(socket.id);
        if (map.size === 0) roomParticipants.delete(classId);
      }
      socket.to(classId).emit("room:user-left", { socketId: socket.id });
      io.to(classId).emit("room:participants", {
        participantCount: getCount(classId),
        participants: Array.from(roomParticipants.get(classId)?.values() || []).map((p) => ({ socketId: p.socketId, userId: p.userId, name: p.name, role: p.role }))
      });
      emitClassCount(classId);
    });
  });

  
  let attempts = 0;
  const maxAttempts = 5;
  
  httpServer.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      attempts++;
      if (attempts < maxAttempts) {
        console.warn(`Port ${PORT} is in use, trying port ${PORT + 1}...`);
        PORT++;
        setTimeout(() => {
          httpServer.listen(PORT, "0.0.0.0");
        }, 500);
      } else {
        console.error(`Could not bind to any port after ${maxAttempts} attempts. Exiting.`);
        process.exit(1);
      }
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`✓ Server running on http://localhost:${PORT}`);
  });
  
  
  httpServer.on('listening', () => {
    const handle = (httpServer as any)._handle;
    if (handle && typeof handle.setBlocking === 'function') {
      handle.setBlocking(true);
    }
  });
}


app.post('/api/generate', authenticate, async (req, res) => {
  try {
    const { model, contents, config, sessionId } = req.body;
    console.log(`[/api/generate] Request: model=${model}, sessionId=${sessionId}`);
    
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
    if (!apiKey) {
      console.error('[/api/generate] ERROR: No GEMINI_API_KEY in env');
      return res.status(500).json({ error: 'Server GEMINI API key not configured' });
    }
    console.log('[/api/generate] Calling AI...');

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({ model, contents, config });
    
    console.log(`[/api/generate] AI response keys:`, Object.keys(response));

    
    const text = response.text || (response.candidates?.[0]?.content?.parts?.[0]?.text) || '';
    console.log(`[/api/generate] Extracted text (first 100 chars):`, text.substring(0, 100));
    
    if (sessionId && typeof text === 'string' && text.length > 0) {
      try {
        await db.collection("messages").insertOne({
          session_id: sessionId,
          role: 'assistant',
          content: text,
          image: null,
          timestamp: new Date()
        });
        console.log(`[/api/generate] Saved to MongoDB`);
      } catch (e) {
        console.error('[/api/generate] DB save error:', e);
      }
    }

    res.json({ ...response, text });
  } catch (err) {
    console.error('[/api/generate] Exception:', err);
    res.status(500).json({ error: 'AI generate failed', details: String(err) });
  }
});

startServer().catch(err => {
  console.error("Server startup error:", err);
  process.exit(1);
});
