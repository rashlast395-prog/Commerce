/* ============================================================
   rt-sync.js — Real-Time Synchronization Client
   ------------------------------------------------------------
   Single library used by Customer site, Admin dashboards
   (dashboard.js / command-center.js) and the Rider app.

   WHAT IT DOES
   - Connects to the WebSocket sync server and authenticates
     with the current Firebase user's ID token.
   - Receives instant push events (order created/updated/status,
     rider assigned/declined, tracking, notifications).
   - Falls back to Firestore onSnapshot when the socket is down,
     so the app ALWAYS works even without the server.
   - Exposes a tiny API:  RTSync.connect(), RTSync.on(event, cb),
     RTSync.createOrder(), RTSync.setStatus(), RTSync.assignRider(),
     RTSync.declineRider(), RTSync.updateTracking(), RTSync.sendLocation().

   Include AFTER firebase.js / the Firebase modules are loaded and
   the auth user is known (it reads window.auth / getAuth()).
   ============================================================ */
(function (global) {
  "use strict";

  var defaults = {
    url: global.location && global.location.protocol === "https:"
      ? "wss://" + (global.RT_SYNC_URL || global.location.hostname)
      : "ws://" + (global.RT_SYNC_URL || "localhost:8080"),
    /* Allow override, e.g. window.RT_SYNC_URL = "ws://123.45.67.89:8080" */
    reconnectDelay: 1500,
    maxReconnect: 20
  };

  var RTSync = {
    ws: null,
    user: null,          // { uid, email, role, riderId }
    connected: false,
    listeners: {},       // event -> [cb]
    _reconnectTries: 0,
    _queue: [],
    fallback: false,     // true if using Firestore-only mode
    _fb: null,           // firebase helpers (set by attachFirebase)

    /* ---- public: subscribe to an event ---- */
    on: function (event, cb) {
      (this.listeners[event] = this.listeners[event] || []).push(cb);
      return this;
    },
    emit: function (event, payload) {
      (this.listeners[event] || []).forEach(function (cb) {
        try { cb(payload); } catch (e) { console.error("[rt-sync] listener error", e); }
      });
      // also emit generic "message"
      (this.listeners["*"] || []).forEach(function (cb) {
        try { cb({ type: event, payload: payload }); } catch (e) {}
      });
    },

    /* ---- public: connect with a user object ---- */
    connect: function (user) {
      this.user = user || this.user;
      if (!this.user) { console.warn("[rt-sync] connect() called without user"); return this; }
      this._open();
      return this;
    },

    _open: function () {
      var self = this;
      try {
        this.ws = new WebSocket(this._resolveUrl());
      } catch (e) {
        return this._enableFallback();
      }
      this.ws.onopen = function () {
        self.connected = true;
        self._reconnectTries = 0;
        self._send({ type: "auth", payload: { idToken: self._idToken() } });
        // flush queue
        self._queue.splice(0).forEach(function (m) { self._send(m); });
        self.emit("connection", { connected: true });
      };
      this.ws.onmessage = function (ev) {
        var msg; try { msg = JSON.parse(ev.data); } catch (e) { return; }
        self._handle(msg);
      };
      this.ws.onclose = function () {
        self.connected = false;
        self.emit("connection", { connected: false });
        if (self._reconnectTries < defaults.maxReconnect) {
          self._reconnectTries++;
          setTimeout(function () { self._open(); }, defaults.reconnectDelay);
        } else {
          self._enableFallback();
        }
      };
      this.ws.onerror = function () { try { self.ws.close(); } catch (e) {} };
    },

    _resolveUrl: function () {
      if (global.RT_SYNC_URL) {
        return global.RT_SYNC_URL.indexOf("://") >= 0 ? global.RT_SYNC_URL : "ws://" + global.RT_SYNC_URL;
      }
      // default: same host, port 8080
      var h = global.location.hostname;
      return (global.location.protocol === "https:" ? "wss://" : "ws://") + h + ":8080";
    },

    _idToken: function () {
      try {
        if (global.auth && global.auth.currentUser) {
          // synchronous cache; refresh below
          return global.__rtToken || null;
        }
      } catch (e) {}
      return global.__rtToken || null;
    },

    _send: function (msg) {
      if (this.ws && this.ws.readyState === 1) { this.ws.send(JSON.stringify(msg)); return true; }
      return false;
    },

    _handle: function (msg) {
      var self = this;
      switch (msg.type) {
        case "hello": this.fallback = false; break;
        case "auth:ok": this.user = Object.assign({}, this.user, msg.payload); this.emit("auth", msg.payload); break;
        case "snapshot": this.emit("snapshot", msg.payload); break;
        case "pong": break;
        case "ok": this.emit("ack", msg.payload); break;
        case "error": console.warn("[rt-sync] server error:", msg.payload && msg.payload.message); this.emit("error", msg.payload); break;
        default:
          // order:* / notification / presence / rider:location
          this.emit(msg.type, msg.payload);
      }
    },

    /* ---- Fallback to Firestore onSnapshot ---- */
    _enableFallback: function () {
      if (this.fallback) return;
      this.fallback = true;
      this.connected = false;
      console.warn("[rt-sync] WebSocket unavailable — using Firestore real-time fallback.");
      this.emit("fallback", { on: true });
      if (this._fb && this._fb.subscribeOrders) this._fb.subscribeOrders();
    },

    attachFirebase: function (fb) { this._fb = fb; return this; },

    /* ---- Helper: refresh token then send a command ---- */
    _cmd: function (type, payload) {
      var self = this;
      payload = payload || {};
      var msg = { type: type, payload: payload };
      if (this.connected) {
        // ensure token freshness
        this._refreshToken(function () { self._send(msg); });
      } else {
        this._refreshToken(function () {
          if (!self._send(msg)) self._queue.push(msg);
        });
      }
    },

    _refreshToken: function (cb) {
      try {
        if (global.auth && global.auth.currentUser) {
          global.auth.currentUser.getIdToken(true).then(function (t) {
            global.__rtToken = t; cb();
          }).catch(function () { cb(); });
        } else cb();
      } catch (e) { cb(); }
    },

    /* ============================================================
       PUBLIC COMMANDS — used by all dashboards
       ============================================================ */
    createOrder: function (order) { this._cmd("order:create", order); },
    updateOrder: function (orderId, patch) { this._cmd("order:update", Object.assign({ id: orderId }, patch)); },
    setStatus: function (orderId, status) { this._cmd("order:setStatus", { id: orderId, status: status }); },
    assignRider: function (orderId, riderId) { this._cmd("order:assign", { id: orderId, riderId: riderId }); },
    declineRider: function (orderId) { this._cmd("order:decline", { id: orderId }); },
    updateTracking: function (orderId, data) { this._cmd("order:tracking:update", Object.assign({ id: orderId }, data)); },
    sendLocation: function (lat, lng) { this._cmd("rider:location:update", { lat: lat, lng: lng }); },
    markNotification: function (id, read) { this._cmd("notification:mark", { id: id, read: read !== false }); }
  };

  global.RTSync = RTSync;
})(window);
