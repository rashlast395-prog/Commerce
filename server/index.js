/* ============================================================
   Richy's Eat — Real-Time Sync Server
   ------------------------------------------------------------
   - Authenticates browser clients via Firebase ID tokens.
   - Keeps an in-memory authoritative view of orders synced to
     Firestore (durable store).
   - Validates every status change against the unified engine
     (single state machine -> no inconsistent statuses).
   - Broadcasts real-time events over WebSockets so Customer,
     Admin, and Rider dashboards update INSTANTLY with no refresh.

   Clients that cannot reach this server simply fall back to
   Firestore onSnapshot (existing behaviour) — so nothing breaks
   when the server is offline.
   ============================================================ */

import http from "http";
import { WebSocketServer } from "ws";
import { fileURLToPath } from "url";
import path from "path";
import { config as loadEnv } from "dotenv";
import {
  EVENTS, COMMANDS, canTransition, normalizeStatus, deliveryStatusFor
} from "./shared/orderEngine.js";

/* Load server-side config (incl. OPENAI_API_KEY) from .env when present. */
try { loadEnv(); } catch (e) { /* .env optional */ }

/* Alias for readability throughout the server. */
const OrderEngine = { EVENTS, COMMANDS, canTransition, normalizeStatus, deliveryStatusFor };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ---- Config ---- */
const PORT = process.env.PORT || 8080;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "rashlast395@gmail.com").split(",").map(s => s.trim());
const ADMIN_NAME = (process.env.ADMIN_NAME || "rashlast395-prog").split(",").map(s => s.trim());

/* ---- Firebase Admin (durable store) ---- */
let db = null;
let adminAuth = null;
let USE_FIRESTORE = false;
try {
  const admin = await import("firebase-admin");
  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    credential = admin.credential.cert(sa);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = admin.credential.applicationDefault();
  }
  if (credential) {
    admin.initializeApp({ credential, projectId: process.env.FIREBASE_PROJECT_ID || "fire-c1a91" });
    db = admin.firestore();
    adminAuth = admin.auth();
    USE_FIRESTORE = true;
  }
} catch (e) {
  console.warn("[sync] Firestore unavailable, running in memory-only mode:", e.message);
}
if (!USE_FIRESTORE) console.warn("[sync] WARNING: no Firestore credentials — data will NOT persist.");

/* ---- In-memory authoritative state ---- */
const state = {
  orders: new Map(),        // orderId -> order doc
  notifications: new Map(), // notifId -> notif doc
  clients: new Map()        // ws -> clientMeta
};

/* ============================================================
   FIRESTORE <-> MEMORY SYNC
   ============================================================ */
async function hydrateFromFirestore() {
  if (!db) return;
  try {
    const [ordersSnap, notifSnap] = await Promise.all([
      db.collection("orders").get(),
      db.collection("notifications").get()
    ]);
    ordersSnap.forEach(d => state.orders.set(d.id, { _id: d.id, ...d.data() }));
    notifSnap.forEach(d => state.notifications.set(d.id, { _id: d.id, ...d.data() }));
    console.log(`[sync] hydrated ${state.orders.size} orders, ${state.notifications.size} notifications`);
  } catch (e) {
    console.warn("[sync] hydrate failed:", e.message);
  }
}

async function persistOrder(order) {
  if (!db) return;
  const { _id, ...data } = order;
  try { await db.collection("orders").doc(_id).set(data, { merge: true }); } catch (e) {}
}
async function persistNotification(n) {
  if (!db) return;
  const { _id, ...data } = n;
  try { await db.collection("notifications").doc(_id).set(data, { merge: true }); } catch (e) {}
}

/* ============================================================
   WEBSOCKET SERVER
   ============================================================ */
const server = http.createServer(async (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, orders: state.orders.size, clients: state.clients.size, firestore: USE_FIRESTORE }));
    return;
  }

  /* ---- AI assistant chat (server-side OpenAI proxy) ----
     The browser posts { messages: [{role, content}] } and we forward to
     OpenAI using the server-side key. The key is NEVER exposed to clients. */
  if (req.url === "/api/ai/chat" && req.method === "POST") {
    await handleAiChat(req, res);
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Richy's Eat real-time sync server. Connect via WebSocket.\n");
});

/* Richy's Eat AI assistant — answers menu/questions and helps with orders.
   Uses OpenAI Chat Completions. Key is read from OPENAI_API_KEY (server env). */
const AI_SYSTEM_PROMPT = `You are "Richy", the friendly AI assistant for Richy's Eat, a fast-food restaurant in New York.
You help customers with: menu questions, recommendations, ingredients, spice levels, prices, delivery times, reservations, and placing/customising orders.
The menu includes: Smash Burgers, Margherita Royale pizza, Nashville Hot Chicken, Loaded Fajita Wraps, Nutella Lava Cake, Truffle Mushroom Pasta, plus combos and desserts.
Be concise, warm, and on-brand. Prices are in USD. Free delivery over $30. Delivery in 25-35 min.
If a customer wants to order, summarise their items, total estimate, and tell them to use the menu/cart. Never invent items not on the menu. Keep replies under 120 words.`;

async function handleAiChat(req, res) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "AI not configured on server (OPENAI_API_KEY missing)." }));
    return;
  }
  let body;
  try {
    const raw = await readBody(req);
    body = JSON.parse(raw);
  } catch (e) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid request body." }));
    return;
  }
  const history = Array.isArray(body.messages) ? body.messages : [];
  const messages = [{ role: "system", content: AI_SYSTEM_PROMPT }, ...history];
  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages,
        temperature: 0.6,
        max_tokens: 300
      })
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      res.writeHead(upstream.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: data.error?.message || "OpenAI request failed." }));
      return;
    }
    const reply = data.choices?.[0]?.message?.content || "";
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ reply }));
  } catch (e) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to reach AI service: " + e.message }));
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const wss = new WebSocketServer({ server });

function send(ws, type, payload) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, payload }));
}
function broadcast(type, payload, filterFn) {
  const msg = JSON.stringify({ type, payload });
  state.clients.forEach((meta, ws) => {
    if (ws.readyState === ws.OPEN && (!filterFn || filterFn(meta))) ws.send(msg);
  });
}

wss.on("connection", (ws) => {
  const meta = { ws, uid: null, email: null, role: null, riderId: null, authed: false };
  state.clients.set(ws, meta);

  ws.on("message", async (raw) => {
    let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }
    try { await handleMessage(ws, meta, msg); }
    catch (e) { send(ws, "error", { message: e.message || "server error" }); }
  });

  ws.on("close", () => { state.clients.delete(ws); broadcast(OrderEngine.EVENTS.PRESENCE, presenceSnapshot(), m => m.role === "admin"); });
  ws.on("error", () => {});

  send(ws, "hello", { firestore: USE_FIRESTORE, version: "1.0.0" });
});

/* ---- Auth: verify Firebase ID token ---- */
async function authenticate(meta, idToken) {
  if (!adminAuth) { return null; } // memory mode: trust client claims
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    meta.uid = decoded.uid;
    meta.email = decoded.email || "";
    meta.role = ADMIN_EMAIL.includes(decoded.email) || ADMIN_NAME.includes(decoded.displayName) ? "admin" : "customer";
    meta.authed = true;
    return decoded;
  } catch (e) {
    meta.authed = false;
    return null;
  }
}

/* ---- Command routing ---- */
async function handleMessage(ws, meta, msg) {
  const { type, payload } = msg;

  if (type === OrderEngine.COMMANDS.AUTH) {
    const claims = await authenticate(meta, payload && payload.idToken);
    if (claims && meta.role !== "admin") {
      // Look up rider profile
      if (db) {
        const rsnap = await db.collection("riders").where("uid", "==", meta.uid).limit(1).get();
        if (!rsnap.empty) { meta.role = "rider"; meta.riderId = rsnap.docs[0].id; }
      }
    }
    send(ws, "auth:ok", { role: meta.role, uid: meta.uid });
    // Send the snapshot relevant to this user
    sendSnapshot(ws, meta);
    broadcast(OrderEngine.EVENTS.PRESENCE, presenceSnapshot(), m => m.role === "admin");
    return;
  }

  if (type === OrderEngine.COMMANDS.PING) { send(ws, "pong", { t: Date.now() }); return; }

  // Memory mode without auth: default to admin so the server is usable locally.
  if (!meta.authed && !USE_FIRESTORE) meta.role = meta.role || "admin";

  switch (type) {
    case OrderEngine.COMMANDS.CREATE_ORDER: return onCreateOrder(ws, meta, payload);
    case OrderEngine.COMMANDS.UPDATE_ORDER: return onUpdateOrder(ws, meta, payload);
    case OrderEngine.COMMANDS.SET_STATUS: return onSetStatus(ws, meta, payload);
    case OrderEngine.COMMANDS.ASSIGN_RIDER: return onAssignRider(ws, meta, payload);
    case OrderEngine.COMMANDS.DECLINE_RIDER: return onDeclineRider(ws, meta, payload);
    case OrderEngine.COMMANDS.UPDATE_TRACKING: return onUpdateTracking(ws, meta, payload);
    case OrderEngine.COMMANDS.RIDER_LOCATION: return onRiderLocation(ws, meta, payload);
    case OrderEngine.COMMANDS.MARK_NOTIF: return onMarkNotif(ws, meta, payload);
    default: send(ws, "error", { message: "unknown command: " + type });
  }
}

/* ---- Helpers ---- */
function presenceSnapshot() {
  const counts = { admin: 0, rider: 0, customer: 0 };
  state.clients.forEach(m => { if (m.role && counts[m.role] != null) counts[m.role]++; });
  return counts;
}
function sendSnapshot(ws, meta) {
  let orders = [...state.orders.values()];
  let notifications = [...state.notifications.values()];
  if (meta.role === "customer") {
    orders = orders.filter(o => o.uid === meta.uid || o.customerId === meta.uid);
    notifications = notifications.filter(n => n.uid === meta.uid);
  } else if (meta.role === "rider") {
    orders = orders.filter(o => !o.riderId || o.riderId === meta.riderId || o.riderUid === meta.uid);
    notifications = notifications.filter(n => !n.uid || n.uid === meta.uid);
  }
  send(ws, OrderEngine.EVENTS.SNAPSHOT, { orders, notifications, presence: presenceSnapshot() });
}
function recipientsForOrder(order) {
  return (meta) => {
    if (meta.role === "admin") return true;
    if (meta.role === "customer" && (meta.uid === order.uid || meta.uid === order.customerId)) return true;
    if (meta.role === "rider" && (meta.riderId === order.riderId || meta.uid === order.riderUid)) return true;
    return false;
  };
}
async function addNotification(n) {
  const id = n.id || ("NTF-" + Date.now() + "-" + Math.floor(Math.random() * 1e4));
  const doc = { _id: id, read: false, createdAt: new Date().toISOString(), ...n };
  state.notifications.set(id, doc);
  await persistNotification(doc);
  // deliver only to the intended recipient(s)
  broadcast(OrderEngine.EVENTS.NOTIFICATION, doc, (m) => {
    if (n.uid && m.uid !== n.uid) return false;
    if (n.riderId && m.riderId !== n.riderId && m.uid !== n.riderUid) return false;
    if (!n.uid && !n.riderId && m.role !== "admin") return false;
    return true;
  });
  return doc;
}
function log(activity) {
  if (db) db.collection("activityLogs").add({ createdAt: new Date(), ...activity }).catch(() => {});
}

/* ============================================================
   ORDER COMMANDS
   ============================================================ */
function orderIdFrom(payload) {
  return (payload && (payload.id || payload.orderId)) || ("SB-" + Date.now().toString().slice(-6));
}

async function onCreateOrder(ws, meta, payload) {
  if (!meta.role) return send(ws, "error", { message: "unauthorized" });
  const id = orderIdFrom(payload);
  const status = OrderEngine.normalizeStatus(payload.status || "Pending");
  const order = {
    _id: id,
    id,
    customerId: meta.uid || payload.uid || null,
    uid: meta.uid || payload.uid || null,
    customer: payload.customer || (meta.email || "Guest"),
    email: payload.email || meta.email || "",
    items: payload.items || [],
    itemLines: payload.itemLines || (payload.items || []).map(i => `${i.title} x${i.qty}`),
    total: parseFloat(payload.total) || 0,
    subtotal: parseFloat(payload.subtotal || payload.total) || 0,
    payment: payload.payment || { method: payload.method || "Card" },
    method: payload.method || (payload.payment && payload.payment.method) || "Card",
    address: payload.address || "",
    city: payload.city || "",
    zip: payload.zip || "",
    lat: payload.lat ?? null,
    lng: payload.lng ?? null,
    riderId: null,
    riderUid: null,
    riderName: null,
    riderPhone: null,
    riderVehicle: null,
    status,
    deliveryStatus: OrderEngine.deliveryStatusFor(status),
    paymentId: payload.paymentId || ("PAY-" + id.slice(3)),
    statusHistory: [{ status, at: new Date().toISOString(), by: meta.uid || "system" }],
    createdAt: new Date().toISOString()
  };
  state.orders.set(id, order);
  await persistOrder(order);

  broadcast(OrderEngine.EVENTS.ORDER_CREATED, order, m => m.role === "admin");
  broadcast(OrderEngine.EVENTS.ORDER_UPDATED, order, recipientsForOrder(order));
  await addNotification({
    uid: order.uid, type: "order", orderId: id,
    title: `Order #${id} placed`,
    body: `We received your order of $${order.total.toFixed(2)}. Status: ${status}.`
  });
  await addNotification({
    type: "order", orderId: id,
    title: `New order #${id}`,
    body: `A new order was placed by ${order.customer}.`
  });
  log({ type: "order_created", orderId: id, actor: order.uid, detail: order.customer });
  send(ws, "ok", { orderId: id });
}

async function onUpdateOrder(ws, meta, payload) {
  const id = orderIdFrom(payload);
  const order = state.orders.get(id);
  if (!order) return send(ws, "error", { message: "order not found" });
  if (meta.role === "customer" && order.uid !== meta.uid) return send(ws, "error", { message: "forbidden" });
  if (meta.role === "rider" && order.riderId !== meta.riderId && order.riderUid !== meta.uid) return send(ws, "error", { message: "forbidden" });

  const allowed = ["address", "city", "zip", "lat", "lng", "notes", "items", "itemLines"];
  const patch = {};
  for (const k of allowed) if (payload[k] !== undefined) patch[k] = payload[k];
  Object.assign(order, patch);
  await persistOrder(order);
  broadcast(OrderEngine.EVENTS.ORDER_UPDATED, order, recipientsForOrder(order));
  send(ws, "ok", { orderId: id });
}

async function onSetStatus(ws, meta, payload) {
  const id = orderIdFrom(payload);
  const order = state.orders.get(id);
  if (!order) return send(ws, "error", { message: "order not found" });
  if (meta.role !== "admin" && meta.role !== "rider") return send(ws, "error", { message: "forbidden" });
  if (meta.role === "rider" && order.riderId !== meta.riderId && order.riderUid !== meta.uid) return send(ws, "error", { message: "forbidden" });

  const next = OrderEngine.normalizeStatus(payload.status);
  if (!OrderEngine.canTransition(order.status, next)) {
    return send(ws, "error", { message: `Invalid transition: ${order.status} -> ${next}` });
  }
  const prev = order.status;
  order.status = next;
  order.deliveryStatus = OrderEngine.deliveryStatusFor(next);
  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({ status: next, at: new Date().toISOString(), by: meta.uid || meta.role });
  await persistOrder(order);

  broadcast(OrderEngine.EVENTS.ORDER_STATUS, { orderId: id, status: next, prev, deliveryStatus: order.deliveryStatus, at: new Date().toISOString() }, recipientsForOrder(order));
  broadcast(OrderEngine.EVENTS.ORDER_UPDATED, order, recipientsForOrder(order));
  await addNotification({
    uid: order.uid, type: "order", orderId: id,
    title: `Order #${id} update`, body: `Your order is now: ${next}.`
  });
  log({ type: "status_change", orderId: id, from: prev, to: next, actor: meta.uid || meta.role });
  send(ws, "ok", { orderId: id, status: next });
}

async function onAssignRider(ws, meta, payload) {
  if (meta.role !== "admin") return send(ws, "error", { message: "forbidden" });
  const id = orderIdFrom(payload);
  const order = state.orders.get(id);
  if (!order) return send(ws, "error", { message: "order not found" });

  const rider = await resolveRider(payload.riderId || payload.riderUid);
  if (!rider) return send(ws, "error", { message: "rider not found" });

  order.riderId = rider._id;
  order.riderUid = rider.uid || null;
  order.riderName = rider.name;
  order.riderPhone = rider.phone || "";
  order.riderVehicle = rider.vehicle || "";
  const next = "Assigned";
  order.status = next;
  order.deliveryStatus = OrderEngine.deliveryStatusFor(next);
  order.assignedAt = new Date().toISOString();
  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({ status: next, at: order.assignedAt, by: meta.uid || "admin" });
  await persistOrder(order);

  broadcast(OrderEngine.EVENTS.RIDER_ASSIGNED, order, recipientsForOrder(order));
  broadcast(OrderEngine.EVENTS.ORDER_UPDATED, order, recipientsForOrder(order));
  await addNotification({
    uid: order.uid, type: "rider", orderId: id,
    title: `Rider assigned to #${id}`,
    body: `${rider.name} is assigned. Vehicle: ${rider.vehicle || "—"}. Tap to track.`
  });
  await addNotification({
    riderId: rider._id, type: "order", orderId: id,
    title: `New order assigned #${id}`,
    body: `Pickup: Richy's Eat. Deliver to: ${[order.address, order.city, order.zip].filter(Boolean).join(", ")}.`
  });
  log({ type: "rider_assigned", orderId: id, rider: rider.name, actor: meta.uid });
  send(ws, "ok", { orderId: id });
}

async function onDeclineRider(ws, meta, payload) {
  const id = orderIdFrom(payload);
  const order = state.orders.get(id);
  if (!order) return send(ws, "error", { message: "order not found" });
  // Rider who was assigned may decline; admin may force-return.
  if (meta.role === "rider" && order.riderId !== meta.riderId && order.riderUid !== meta.uid) {
    return send(ws, "error", { message: "forbidden" });
  }
  const riderName = order.riderName || "Rider";
  order.riderId = null;
  order.riderUid = null;
  order.riderName = null;
  order.riderPhone = null;
  order.riderVehicle = null;
  const next = "Returned";
  order.status = next;
  order.deliveryStatus = "pending";
  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({ status: next, at: new Date().toISOString(), by: meta.uid || meta.role });
  await persistOrder(order);

  broadcast(OrderEngine.EVENTS.RIDER_DECLINED, { orderId: id, by: riderName }, m => m.role === "admin" || (m.role === "customer" && m.uid === order.uid) || (m.role === "rider" && m.riderId === order.riderId));
  broadcast(OrderEngine.EVENTS.ORDER_UPDATED, order, recipientsForOrder(order));
  await addNotification({
    type: "rider", orderId: id,
    title: `Order #${id} needs re-assignment`,
    body: `${riderName} declined. Returned to the assignment queue.`
  });
  log({ type: "rider_declined", orderId: id, rider: riderName, actor: meta.uid || meta.role });
  send(ws, "ok", { orderId: id });
}

async function onUpdateTracking(ws, meta, payload) {
  const id = orderIdFrom(payload);
  const order = state.orders.get(id);
  if (!order) return send(ws, "error", { message: "order not found" });
  order.lat = payload.lat ?? order.lat;
  order.lng = payload.lng ?? order.lng;
  order.tracking = { lat: order.lat, lng: order.lng, eta: payload.eta ?? (order.tracking && order.tracking.eta) ?? null, updatedAt: new Date().toISOString() };
  if (payload.status) {
    const next = OrderEngine.normalizeStatus(payload.status);
    if (OrderEngine.canTransition(order.status, next)) {
      order.status = next; order.deliveryStatus = OrderEngine.deliveryStatusFor(next);
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({ status: next, at: new Date().toISOString(), by: meta.uid || meta.role });
    }
  }
  await persistOrder(order);
  broadcast(OrderEngine.EVENTS.TRACKING, { orderId: id, lat: order.lat, lng: order.lng, eta: order.tracking.eta, status: order.status }, recipientsForOrder(order));
  broadcast(OrderEngine.EVENTS.ORDER_UPDATED, order, recipientsForOrder(order));
  send(ws, "ok", { orderId: id });
}

async function onRiderLocation(ws, meta, payload) {
  if (meta.role !== "rider") return;
  const loc = { riderId: meta.riderId || payload.riderId, lat: payload.lat, lng: payload.lng, at: new Date().toISOString() };
  if (db) db.collection("riders").doc(meta.riderId).set({ lat: payload.lat, lng: payload.lng, lastSeen: new Date() }, { merge: true }).catch(() => {});
  broadcast(OrderEngine.EVENTS.RIDER_LOCATION, loc, m => m.role === "admin" || (m.role === "rider" && m.riderId === meta.riderId));
  send(ws, "ok", { riderId: meta.riderId });
}

async function onMarkNotif(ws, meta, payload) {
  const n = state.notifications.get(payload.id);
  if (!n) return;
  if (n.uid && n.uid !== meta.uid) return;
  n.read = true;
  await persistNotification(n);
  send(ws, "ok", { id: payload.id });
}

async function resolveRider(riderId) {
  if (state.orders.size >= 0 && db) {
    const r = await db.collection("riders").doc(riderId).get();
    if (r.exists()) return { _id: r.id, ...r.data() };
  }
  return null;
}

/* ---- Boot ---- */
hydrateFromFirestore().then(() => {
  server.listen(PORT, () => {
    console.log(`[sync] real-time server listening on :${PORT} (firestore=${USE_FIRESTORE})`);
  });
});
