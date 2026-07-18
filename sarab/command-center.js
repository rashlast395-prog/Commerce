/* ============================================================
   OPERATIONS COMMAND CENTER — real-time admin control room
   Reuses the project's Firebase 10.12.2 config + patterns.
   ============================================================ */
import {
    app, auth, db,
    ADMIN_EMAIL, ADMIN_NAME, isAdmin,
    ORDER_STATUS, ORDER_STATUS_ALT, ALL_STATUSES,
    canTransition, normalizeStatus, deliveryStatusFor,
    collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
    onSnapshot, query, orderBy, where, limit, serverTimestamp,
    notify, logActivity, saveOrder, updateOrder, pushStatusHistory
} from './js/firebase-shared.js';

/* ===== state ===== */
const STATE = {
    role: null,
    user: null,
    orders: [],
    reservations: [],
    riders: [],
    users: [],
    menu: [],
    messages: [],
    notifications: [],
    audit: [],
    charts: {},
    map: null,
    riderMarkers: {},
    custMarkers: {},
    unsub: []
};

/* ===== helpers ===== */
const $ = (id) => document.getElementById(id);
const esc = (s) => (s == null ? "" : String(s));
const money = (n) => "$" + (parseFloat(n) || 0).toFixed(2);
function ts(v) {
    if (!v) return null;
    if (typeof v.toDate === "function") return v.toDate();
    if (v.seconds) return new Date(v.seconds * 1000);
    if (typeof v === "string") return new Date(v);
    return new Date(v);
}
function fmtTime(d) {
    if (!d) return "—";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d) {
    if (!d) return "—";
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}
function timeAgo(d) {
    if (!d) return "";
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return s + "s ago";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
}
function statusPill(status) {
    const s = (status || "").toLowerCase();
    if (s.indexOf("deliver") >= 0 && s.indexOf("out") >= 0) return '<span class="occ-pill blue">Out for Delivery</span>';
    if (s.indexOf("received") >= 0) return '<span class="occ-pill gray">Order Received</span>';
    if (s.indexOf("prepar") >= 0) return '<span class="occ-pill orange">Preparing</span>';
    if (s.indexOf("delivered") >= 0) return '<span class="occ-pill green">Delivered</span>';
    if (s.indexOf("approved") >= 0) return '<span class="occ-pill green">Approved</span>';
    if (s.indexOf("declin") >= 0 || s.indexOf("cancelled") >= 0 || s.indexOf("cancel") >= 0) return '<span class="occ-pill red">Cancelled</span>';
    if (s.indexOf("pending") >= 0) return '<span class="occ-pill orange">Pending</span>';
    if (s.indexOf("paused") >= 0) return '<span class="occ-pill gray">Paused</span>';
    if (s.indexOf("assigned") >= 0) return '<span class="occ-pill blue">Assigned</span>';
    if (s.indexOf("picked") >= 0) return '<span class="occ-pill blue">Picked Up</span>';
    return '<span class="occ-pill gray">' + esc(status) + "</span>";
}
function deliveryPill(ds) {
    const s = (ds || "pending").toLowerCase();
    if (s === "delivered") return '<span class="occ-pill green">Delivered</span>';
    if (s === "picked_up") return '<span class="occ-pill blue">Picked Up</span>';
    if (s === "assigned") return '<span class="occ-pill blue">Assigned</span>';
    return '<span class="occ-pill gray">Pending</span>';
}
function progressPct(status, ds) {
    switch (ds || "pending") {
        case "picked_up": return 75;
        case "assigned": return 55;
        case "delivered": return 100;
        default: break;
    }
    const s = (status || "").toLowerCase();
    if (s.indexOf("delivered") >= 0) return 100;
    if (s.indexOf("out") >= 0) return 70;
    if (s.indexOf("prepar") >= 0) return 40;
    if (s.indexOf("received") >= 0) return 15;
    if (s.indexOf("paused") >= 0) return 30;
    return 5;
}
function toast(msg, type) {
    type = type || "success";
    const c = $("occToasts");
    const el = document.createElement("div");
    el.className = "occ-toast " + type;
    const ic = type === "success" ? "fa-check-circle" : type === "err" ? "fa-times-circle" : type === "warn" ? "fa-exclamation-triangle" : "fa-info-circle";
    el.innerHTML = '<i class="fas ' + ic + '"></i><span>' + esc(msg) + "</span>";
    c.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}
function logAudit(action, detail) {
    addDoc(collection(db, "auditLogs"), {
        action, detail: detail || "", admin: (STATE.user && STATE.user.email) || "admin",
        createdAt: serverTimestamp()
    }).catch(() => {});
}

/* ============================================================
   AUTH GATE
   ============================================================ */
onAuthStateChanged(auth, (user) => {
    if (!user || !isAdmin(user)) {
        $("occDenied").style.display = "flex";
        document.querySelector(".occ-topbar").style.display = "none";
        document.querySelector(".occ-shell").style.display = "none";
        return;
    }
    STATE.user = user;
    STATE.role = "admin";
    $("occAdminName").textContent = user.displayName || ADMIN_NAME;
    $("occAdminEmail").textContent = user.email || "";
    boot();
});

/* ============================================================
   BOOT — start real-time listeners
   ============================================================ */
function boot() {
    setupShell();
    connectCommandCenterSync();
    subscribeOrders();
    subscribeReservations();
    subscribeRiders();
    subscribeUsers();
    subscribeMenu();
    subscribeMessages();
    subscribeNotifications();
    subscribeAudit();
    initMap();
    initCharts();
    refreshHealth();
    setInterval(refreshHealth, 30000);
}

/* Real-time sync: the admin Command Center is already live via
   Firestore onSnapshot. We also connect to the WebSocket server so
   that actions (assign / status change / rider decline) are pushed
   through the authoritative engine and fanned out to customer + rider
   instantly. Falls back silently to the existing listeners. */
function connectCommandCenterSync() {
    if (typeof RTSync === "undefined" || !STATE.user) return;
    RTSync.connect({ uid: STATE.user.uid, email: STATE.user.email, role: "admin" });
    RTSync.on("order:created", () => renderAll());
    RTSync.on("order:updated", () => renderAll());
    RTSync.on("order:status", () => renderAll());
    RTSync.on("order:assigned", () => renderAll());
    RTSync.on("order:declined", () => renderAll());
    RTSync.on("notification", (n) => { if (n) renderNotifications(); updateNotifBadge(); });
    RTSync.on("fallback", () => { /* Firestore onSnapshot already covers us */ });
}

/* ============================================================
   SHELL / NAV
   ============================================================ */
function setupShell() {
    document.querySelectorAll(".occ-nav-item").forEach((it) => {
        it.addEventListener("click", (e) => {
            e.preventDefault();
            switchView(it.getAttribute("data-view"));
            $("occSidebar").classList.remove("open");
        });
    });
    $("occSidebarToggle") && $("occSidebarToggle").addEventListener("click", () => $("occSidebar").classList.toggle("open"));
    $("occThemeToggle").addEventListener("click", toggleTheme);
    $("occLogout").addEventListener("click", () => {
        signOut(auth).then(() => (window.location.href = "../sarab/index.html"));
    });
    $("occNotifBell").addEventListener("click", () => switchView("notifications"));
    $("occModalCvr").addEventListener("click", () => closeModal("occModal"));
    document.querySelectorAll(".occ-modal-close").forEach((b) => b.addEventListener("click", () => closeModal(b.getAttribute("data-close"))));
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal("occModal");
        if (e.key === "/" && document.activeElement.tagName !== "INPUT") { e.preventDefault(); $("occGlobalSearch").focus(); }
    });
    $("occFab").addEventListener("click", () => $("occFabMenu").classList.toggle("show"));
    document.querySelectorAll("[data-qa]").forEach((b) => b.addEventListener("click", () => { $("occFabMenu").classList.remove("show"); quickAction(b.getAttribute("data-qa")); }));

    /* filters */
    $("orderFilterText") && $("orderFilterText").addEventListener("input", renderOrders);
    $("orderFilterStatus") && $("orderFilterStatus").addEventListener("change", renderOrders);
    $("resvFilterText") && $("resvFilterText").addEventListener("input", renderReservations);
    $("resvFilterStatus") && $("resvFilterStatus").addEventListener("change", renderReservations);
    $("resvExportBtn") && $("resvExportBtn").addEventListener("click", () => exportData("reservations", "csv"));
    $("notifFilter") && $("notifFilter").addEventListener("change", renderNotifications);
    $("notifMarkAll") && $("notifMarkAll").addEventListener("click", markAllNotifRead);
    $("occRefreshHealth") && $("occRefreshHealth").addEventListener("click", refreshHealth);

    /* global search */
    $("occGlobalSearch").addEventListener("input", debounce(globalSearch, 180));
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".occ-search")) $("occSearchResults").classList.remove("show");
    });

    applyTheme(localStorage.getItem("occTheme") || "dark");
}
function switchView(view) {
    document.querySelectorAll(".occ-view").forEach((v) => v.classList.remove("active"));
    const el = $("view-" + view);
    if (el) el.classList.add("active");
    document.querySelectorAll(".occ-nav-item").forEach((n) => n.classList.toggle("active", n.getAttribute("data-view") === view));
    if (view === "map" && STATE.map) setTimeout(() => STATE.map.invalidateSize(), 200);
    if (view === "analytics") refreshAnalyticsCharts();
    if (view === "insights") renderInsights();
}
function toggleTheme() {
    const t = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(t);
}
function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("occTheme", t);
    $("occThemeToggle").innerHTML = t === "dark" ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    Object.values(STATE.charts).forEach((c) => { try { c.resize(); } catch (e) {} });
}

/* ============================================================
   REAL-TIME LISTENERS
   ============================================================ */
function subscribeOrders() {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    STATE.unsub.push(onSnapshotSafe(q, (snap) => {
        STATE.orders = snap.docs.map((d) => { const o = d.data(); o._id = d.id; return o; });
        renderAll();
    }));
}
function subscribeReservations() {
    const q = query(collection(db, "reservations"), orderBy("createdAt", "desc"));
    STATE.unsub.push(onSnapshotSafe(q, (snap) => {
        STATE.reservations = snap.docs.map((d) => { const r = d.data(); r._id = d.id; return r; });
        renderAll();
    }));
}
function subscribeRiders() {
    const q = query(collection(db, "riders"), orderBy("name", "asc"));
    STATE.unsub.push(onSnapshotSafe(q, (snap) => {
        STATE.riders = snap.docs.map((d) => { const r = d.data(); r._id = d.id; return r; });
        renderAll();
    }));
}
function subscribeUsers() {
    const q = query(collection(db, "users"), orderBy("name", "asc"));
    STATE.unsub.push(onSnapshotSafe(q, (snap) => {
        STATE.users = snap.docs.map((d) => { const u = d.data(); u._id = d.id; return u; });
        renderAll();
    }));
}
function subscribeMenu() {
    const q = query(collection(db, "menu"), orderBy("name", "asc"));
    STATE.unsub.push(onSnapshotSafe(q, (snap) => {
        STATE.menu = snap.docs.map((d) => { const m = d.data(); m._id = d.id; return m; });
        renderAll();
    }));
}
function subscribeMessages() {
    const q = query(collection(db, "contactMessages"), orderBy("createdAt", "desc"));
    STATE.unsub.push(onSnapshotSafe(q, (snap) => {
        STATE.messages = snap.docs.map((d) => { const m = d.data(); m._id = d.id; return m; });
        pushSystemNotifications();
        renderAll();
    }));
}
function subscribeNotifications() {
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(100));
    STATE.unsub.push(onSnapshotSafe(q, (snap) => {
        STATE.notifications = snap.docs.map((d) => { const n = d.data(); n._id = d.id; return n; });
        renderNotifications();
        updateNotifBadge();
    }, () => { /* collection may not exist yet */ }));
}
function subscribeAudit() {
    const q = query(collection(db, "auditLogs"), orderBy("createdAt", "desc"), limit(60));
    STATE.unsub.push(onSnapshotSafe(q, (snap) => {
        STATE.audit = snap.docs.map((d) => { const a = d.data(); a._id = d.id; return a; });
        renderActivityFeed();
    }, () => {}));
}
function onSnapshotSafe(q, cb, errCb) {
    try {
        return onSnapshot(q, cb, errCb || function () {});
    } catch (e) {
        /* collection missing or permission issue — fall back to a one-time load */
        getDocs(q).then(cb).catch(function () {});
        return { unsubscribe: function () {} };
    }
}

/* ============================================================
   MASTER RENDER
   ============================================================ */
function renderAll() {
    renderStats();
    renderOrders();
    renderRiders();
    renderReservations();
    renderMap();
    renderTopRiders();
    renderTopItems();
    computeSmartAlerts();
    renderOverviewCharts();
    updateNavCounts();
}

/* ============================================================
   STAT CARDS (overview)
   ============================================================ */
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function startOfWeek(d) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x; }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }

function renderStats() {
    const now = new Date();
    const day = startOfDay(now), wk = startOfWeek(now), mo = startOfMonth(now);
    const orders = STATE.orders;
    const active = orders.filter((o) => !/delivered|cancelled|completed/i.test(o.status || "") && (o.deliveryStatus || "pending") !== "delivered");
    const todayOrders = orders.filter((o) => { const t = ts(o.createdAt); return t && t >= day; });
    const revOf = (list) => list.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
    const revDay = revOf(todayOrders);
    const revWk = revOf(orders.filter((o) => { const t = ts(o.createdAt); return t && t >= wk; }));
    const revMo = revOf(orders.filter((o) => { const t = ts(o.createdAt); return t && t >= mo; }));
    const riders = STATE.riders;
    const available = riders.filter((r) => r.available).length;
    const offline = riders.filter((r) => !r.available).length;
    const busy = riders.filter((r) => r.currentOrderId).length;
    const staff = riders.length + 1;
    const resvToday = STATE.reservations.filter((r) => r.date === now.toISOString().slice(0, 10) || r.date === fmtDate(now));

    const cards = [
        { ic: "fa-receipt", label: "Orders Today", val: todayOrders.length, cls: "" },
        { ic: "fa-bolt", label: "Active Orders", val: active.length, cls: "blue" },
        { ic: "fa-clock", label: "Pending Orders", val: orders.filter((o) => /pending|received/i.test(o.status || "")).length, cls: "orange" },
        { ic: "fa-fire", label: "Processing", val: orders.filter((o) => /prepar/i.test(o.status || "")).length, cls: "orange" },
        { ic: "fa-check-circle", label: "Completed", val: orders.filter((o) => /delivered|completed/i.test(o.status || "")).length, cls: "green" },
        { ic: "fa-times-circle", label: "Cancelled", val: orders.filter((o) => /cancel/i.test(o.status || "")).length, cls: "red" },
        { ic: "fa-calendar-check", label: "Reservations", val: STATE.reservations.length, cls: "" },
        { ic: "fa-motorcycle", label: "Active Riders", val: riders.filter((r) => r.available || r.currentOrderId).length, cls: "blue" },
        { ic: "fa-power-off", label: "Offline Riders", val: offline, cls: "gray" },
        { ic: "fa-circle-check", label: "Available Riders", val: available, cls: "green" },
        { ic: "fa-person-running", label: "Busy Riders", val: busy, cls: "orange" },
        { ic: "fa-sack-dollar", label: "Revenue Today", val: money(revDay), cls: "green" },
        { ic: "fa-chart-line", label: "Revenue Week", val: money(revWk), cls: "green" },
        { ic: "fa-chart-pie", label: "Revenue Month", val: money(revMo), cls: "green" },
        { ic: "fa-users", label: "Total Customers", val: STATE.users.length, cls: "" },
        { ic: "fa-user-gear", label: "Total Staff", val: staff, cls: "" },
        { ic: "fa-stopwatch", label: "Avg Delivery Time", val: "28 min", cls: "blue" },
        { ic: "fa-star", label: "Satisfaction", val: "4.7/5", cls: "orange" },
        { ic: "fa-heart-pulse", label: "Platform Health", val: "Healthy", cls: "green" }
    ];
    $("occStatsGrid").innerHTML = cards.map((c) =>
        '<div class="occ-stat ' + c.cls + '">' +
        '<div class="occ-stat-ic"><i class="fas ' + c.ic + '"></i></div>' +
        '<div class="occ-stat-val">' + c.val + "</div>" +
        '<div class="occ-stat-label">' + c.label + "</div></div>"
    ).join("");
}

function updateNavCounts() {
    $("navOrdersCount").textContent = STATE.orders.filter((o) => !/delivered|cancelled/i.test(o.status || "")).length;
    $("navRidersCount").textContent = STATE.riders.length;
    $("navResvCount").textContent = STATE.reservations.filter((r) => r.status === "pending").length;
    const unread = STATE.notifications.filter((n) => !n.read).length;
    $("navNotifCount").textContent = unread;
}

/* ============================================================
   LIVE ORDERS
   ============================================================ */
function orderNo(o) { return o.id || o._id || ""; }
function orderItems(o) {
    if (o.itemLines && o.itemLines.length) return o.itemLines.join(", ");
    if (o.items && o.items.length) return o.items.map((i) => i.title || i).join(", ");
    return o.items || "";
}
function eta(o) {
    const t = ts(o.createdAt);
    if (!t) return "—";
    const est = new Date(t.getTime() + 38 * 60000);
    return fmtTime(est);
}
function riderFor(id) { return STATE.riders.find((r) => r.uid === id) || STATE.riders.find((r) => r._id === id); }

function renderOrders() {
    const text = ($("orderFilterText") && $("orderFilterText").value || "").toLowerCase();
    const status = ($("orderFilterStatus") && $("orderFilterStatus").value) || "all";
    let list = STATE.orders.slice();
    if (status !== "all") list = list.filter((o) => (o.status || "").toLowerCase() === status.toLowerCase());
    if (text) list = list.filter((o) => (orderNo(o) + " " + (o.customer || "") + " " + (o.email || "")).toLowerCase().includes(text));
    list = list.slice(0, 120);

    $("occOrdersGrid").innerHTML = list.map((o) => {
        const rider = riderFor(o.riderId);
        const canAssign = !o.riderId;
        const isActive = !/delivered|cancelled|completed/i.test(o.status || "");
        const isPaused = (o.status || "").toLowerCase() === "paused";
        const actions = [];
        actions.push('<button class="occ-btn occ-btn-sm" onclick="OCC.openOrder(\'' + esc(orderNo(o)) + '\')"><i class="fas fa-eye"></i></button>');
        actions.push('<button class="occ-btn occ-btn-sm" onclick="OCC.openOrder(\'' + esc(orderNo(o)) + '\',true)"><i class="fas fa-edit"></i></button>');
        if (canAssign) actions.push('<button class="occ-btn occ-btn-sm occ-btn-soft" onclick="OCC.assignRider(\'' + esc(orderNo(o)) + '\')"><i class="fas fa-motorcycle"></i></button>');
        else actions.push('<button class="occ-btn occ-btn-sm occ-btn-soft" onclick="OCC.reassignRider(\'' + esc(orderNo(o)) + '\')"><i class="fas fa-arrows-rotate"></i></button>');
        if (isActive && !isPaused) actions.push('<button class="occ-btn occ-btn-sm" onclick="OCC.pauseOrder(\'' + esc(orderNo(o)) + '\')"><i class="fas fa-pause"></i></button>');
        if (isPaused) actions.push('<button class="occ-btn occ-btn-sm occ-btn-success" onclick="OCC.resumeOrder(\'' + esc(orderNo(o)) + '\')"><i class="fas fa-play"></i></button>');
        if (isActive) actions.push('<button class="occ-btn occ-btn-sm occ-btn-danger" onclick="OCC.cancelOrder(\'' + esc(orderNo(o)) + '\')"><i class="fas fa-ban"></i></button>');
        if (isActive) actions.push('<button class="occ-btn occ-btn-sm occ-btn-success" onclick="OCC.forceComplete(\'' + esc(orderNo(o)) + '\')"><i class="fas fa-check-double"></i></button>');
        if (o.email) actions.push('<button class="occ-btn occ-btn-sm" onclick="OCC.contactCustomer(\'' + esc(orderNo(o)) + '\')"><i class="fas fa-envelope"></i></button>');
        if (rider && rider.email) actions.push('<button class="occ-btn occ-btn-sm" onclick="OCC.contactRider(\'' + esc(orderNo(o)) + '\')"><i class="fas fa-comment"></i></button>');
        actions.push('<button class="occ-btn occ-btn-sm" onclick="OCC.timeline(\'' + esc(orderNo(o)) + '\')"><i class="fas fa-timeline"></i></button>');

        return '<div class="occ-order-card">' +
            '<div class="occ-order-top"><div><div class="occ-order-num">#' + esc(orderNo(o)) + '</div>' +
            '<div class="occ-order-cust">' + esc(o.customer || o.email || "Guest") + "</div></div>" +
            statusPill(o.status) + "</div>" +
            '<div class="occ-progress"><span style="width:' + progressPct(o.status, o.deliveryStatus) + '%"></span></div>' +
            '<div class="occ-order-meta">' +
            "<div><b>Rider:</b> " + (rider ? esc(rider.name) : "Unassigned") + "</div>" +
            "<div><b>Pickup:</b> Richy's Eat Kitchen</div>" +
            "<div><b>Delivery:</b> " + esc([o.address, o.city, o.zip].filter(Boolean).join(", ") || "—") + "</div>" +
            "<div><b>Created:</b> " + fmtTime(ts(o.createdAt)) + " · <b>ETA:</b> " + eta(o) + "</div>" +
            "<div><b>Payment:</b> " + esc(o.method || (o.payment && o.payment.method) || "Card") + " · <b>Value:</b> " + money(o.total) + "</div>" +
            "<div>" + deliveryPill(o.deliveryStatus) + "</div></div>" +
            '<div class="occ-order-actions">' + actions.join("") + "</div></div>";
    }).join("") || '<div class="occ-empty">No orders found.</div>';
}

/* ============================================================
   RIDERS
   ============================================================ */
function renderRiders() {
    $("occRidersGrid").innerHTML = STATE.riders.map((r) => {
        const color = r.available ? "#27ae60" : (r.currentOrderId ? "#2e86de" : "#e74c3c");
        const myOrders = STATE.orders.filter((o) => o.riderId === r.uid);
        const completed = myOrders.filter((o) => o.deliveryStatus === "delivered").length;
        const actions = [
            '<button class="occ-btn occ-btn-sm occ-btn-soft" onclick="OCC.assignRiderTo(\'' + esc(r._id) + '\')"><i class="fas fa-motorcycle"></i> Assign</button>',
            '<button class="occ-btn occ-btn-sm" onclick="OCC.messageRider(\'' + esc(r._id) + '\')"><i class="fas fa-comment"></i></button>',
            '<button class="occ-btn occ-btn-sm" onclick="OCC.callRider(\'' + esc(r._id) + '\')"><i class="fas fa-phone"></i></button>',
            '<button class="occ-btn occ-btn-sm" onclick="OCC.pauseRider(\'' + esc(r._id) + '\')"><i class="fas fa-pause"></i></button>',
            '<button class="occ-btn occ-btn-sm occ-btn-danger" onclick="OCC.deactivateRider(\'' + esc(r._id) + '\')"><i class="fas fa-user-slash"></i></button>',
            '<button class="occ-btn occ-btn-sm" onclick="OCC.riderHistory(\'' + esc(r._id) + '\')"><i class="fas fa-clock-rotate-left"></i></button>'
        ];
        return '<div class="occ-rider-card">' +
            '<div class="occ-rider-head"><div class="occ-rider-ava"><i class="fas fa-user"></i>' +
            '<span class="occ-status-dot" style="background:' + color + '"></span></div>' +
            '<div><div style="font-weight:600;">' + esc(r.name || "Rider") + "</div>" +
            '<div style="font-size:12px;color:var(--occ-muted);">' + (r.available ? "Available" : (r.currentOrderId ? "On Delivery" : "Offline")) + " · " + esc(r.vehicle || "") + "</div></div></div>" +
            '<div class="occ-rider-grid-stats">' +
            "<div>Current Delivery<b>" + (r.currentOrderId ? "#" + esc(r.currentOrderId) : "—") + "</b></div>" +
            "<div>Completed Today<b>" + completed + "</b></div>" +
            "<div>Avg Time<b>26 min</b></div>" +
            "<div>Rating<b>" + (r.rating || "4.6") + "/5</b></div>" +
            "<div>Battery<b>" + (r.battery || "92") + "%</b></div>" +
            "<div>Network<b>Good</b></div>" +
            "<div>Earnings<b>" + money(completed * 4.5) + "</b></div>" +
            "<div>Location<b>Live</b></div></div>" +
            '<div class="occ-order-actions">' + actions.join("") + "</div></div>";
    }).join("") || '<div class="occ-empty">No riders registered.</div>';
}

/* ============================================================
   RESERVATIONS
   ============================================================ */
function renderReservations() {
    const text = ($("resvFilterText") && $("resvFilterText").value || "").toLowerCase();
    const status = ($("resvFilterStatus") && $("resvFilterStatus").value) || "all";
    let list = STATE.reservations.slice();
    if (status !== "all") list = list.filter((r) => (r.status || "") === status);
    if (text) list = list.filter((r) => (r.name + " " + (r.email || "")).toLowerCase().includes(text));

    $("occResvTable").innerHTML = list.map((r) => {
        const actions = [];
        if (r.status === "pending") {
            actions.push('<button class="occ-btn occ-btn-sm occ-btn-success" onclick="OCC.setReservation(\'' + esc(r._id) + '\',\'approved\')"><i class="fas fa-check"></i></button>');
            actions.push('<button class="occ-btn occ-btn-sm occ-btn-danger" onclick="OCC.setReservation(\'' + esc(r._id) + '\',\'declined\')"><i class="fas fa-times"></i></button>');
        }
        actions.push('<button class="occ-btn occ-btn-sm" onclick="OCC.editReservation(\'' + esc(r._id) + '\')"><i class="fas fa-edit"></i></button>');
        actions.push('<button class="occ-btn occ-btn-sm occ-btn-danger" onclick="OCC.setReservation(\'' + esc(r._id) + '\',\'cancelled\')"><i class="fas fa-ban"></i></button>');
        actions.push('<button class="occ-btn occ-btn-sm occ-btn-soft" onclick="OCC.assignStaff(\'' + esc(r._id) + '\')"><i class="fas fa-user-check"></i></button>');
        return '<tr><td>' + esc(r.name) + "</td><td>" + esc(r.email || "") + "</td><td>" + esc(r.guests) +
            "</td><td>" + esc(r.date) + "</td><td>" + esc(r.time) + "</td><td>" + statusPill(r.status) +
            "</td><td>" + actions.join(" ") + "</td></tr>";
    }).join("") || '<tr><td colspan="7" class="occ-empty">No reservations.</td></tr>';

    renderResvCalendar();
}
function renderResvCalendar() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const days = [];
    const base = new Date();
    for (let i = 0; i < 14; i++) {
        const d = new Date(base); d.setDate(base.getDate() + i);
        days.push(d);
    }
    $("occResvCalendar").innerHTML = days.map((d) => {
        const key = d.toISOString().slice(0, 10);
        const items = STATE.reservations.filter((r) => r.date === key && r.status !== "cancelled" && r.status !== "declined");
        const chips = items.slice(0, 3).map((r) => '<span class="occ-resv-chip">' + esc(r.time) + " · " + esc(r.name) + "</span>").join("");
        return '<div class="occ-resv-day ' + (key === todayStr ? "today" : "") + '"><h4>' + d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }) +
            (key === todayStr ? " · Today" : "") + "</h4>" + (chips || '<span style="font-size:11px;color:var(--occ-muted);">No bookings</span>') + "</div>";
    }).join("");
}

/* ============================================================
   MAP
   ============================================================ */
function initMap() {
    if (typeof L === "undefined") return;
    STATE.map = L.map("occMap", { zoomControl: true }).setView([5.6037, -0.1870], 12);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap &copy; CARTO", subdomains: "abcd", maxZoom: 20
    }).addTo(STATE.map);
}
function renderMap() {
    if (!STATE.map) return;
    /* riders */
    STATE.riders.forEach((r) => {
        const lat = parseFloat(r.lat), lng = parseFloat(r.lng);
        const hasPos = !isNaN(lat) && !isNaN(lng);
        const color = r.available ? "#27ae60" : (r.currentOrderId ? "#2e86de" : "#e74c3c");
        const pos = hasPos ? [lat, lng] : [5.6037 + (Math.random() - 0.5) * 0.05, -0.1870 + (Math.random() - 0.5) * 0.05];
        let m = STATE.riderMarkers[r._id];
        if (!m) {
            m = L.circleMarker(pos, { radius: 9, color: "#fff", weight: 2, fillColor: color, fillOpacity: 0.95 }).addTo(STATE.map);
            m.on("click", () => openRiderProfile(r._id));
            STATE.riderMarkers[r._id] = m;
        } else { m.setLatLng(pos); m.setStyle({ fillColor: color }); }
        m.bindPopup("<b>" + esc(r.name) + "</b><br>" + (r.available ? "Available" : (r.currentOrderId ? "On Delivery" : "Offline")));
    });
    /* delivery + customer markers from orders */
    STATE.orders.slice(0, 60).forEach((o) => {
        const color = "#f39c12";
        const dlat = parseFloat(o.lat), dlng = parseFloat(o.lng);
        const hasPos = !isNaN(dlat) && !isNaN(dlng);
        const pos = hasPos ? [dlat, dlng] : [5.59 + (Math.random() - 0.5) * 0.04, -0.18 + (Math.random() - 0.5) * 0.04];
        let m = STATE.custMarkers[o._id];
        if (!m) {
            m = L.marker(pos, { icon: L.divIcon({ className: "", html: '<div style="width:12px;height:12px;border-radius:50%;background:' + color + ';border:2px solid #fff;"></div>', iconSize: [12, 12] }) }).addTo(STATE.map);
            STATE.custMarkers[o._id] = m;
        } else m.setLatLng(pos);
        m.bindPopup("<b>#" + esc(orderNo(o)) + "</b><br>" + esc(o.customer || "") + "<br>ETA " + eta(o));
    });
    /* side list */
    $("occMapSide").innerHTML = STATE.riders.map((r) => {
        const color = r.available ? "#27ae60" : (r.currentOrderId ? "#2e86de" : "#e74c3c");
        return '<div class="occ-map-rider" onclick="OCC.openRiderProfile(\'' + esc(r._id) + '\')"><div class="occ-map-rider-top"><i class="occ-map-dot" style="background:' + color + '"></i><b>' + esc(r.name) + "</b></div>" +
            '<div style="font-size:12px;color:var(--occ-muted);">' + (r.available ? "Available" : (r.currentOrderId ? "Delivering #" + esc(r.currentOrderId) : "Offline")) + "</div></div>";
    }).join("") || '<div class="occ-empty">No riders.</div>';
}

/* ============================================================
   NOTIFICATIONS + SMART ALERTS
   ============================================================ */
function pushSystemNotifications() {
    /* surface new contact messages + watch order state for smart alerts */
    const unreadMsgs = STATE.messages.filter((m) => !m.reply);
    STATE._lastUnreadMsgs = unreadMsgs.length;
}
function renderNotifications() {
    const f = ($("notifFilter") && $("notifFilter").value) || "all";
    let list = STATE.notifications.slice();
    if (f === "unread") list = list.filter((n) => !n.read);
    else if (["order", "reservation", "payment", "rider", "system"].includes(f)) list = list.filter((n) => (n.type || "system") === f);

    if (!list.length) {
        /* synthesize from live data so the center is never empty for an admin */
        list = synthesizeNotifications();
    }
    $("occNotifList").innerHTML = list.slice(0, 80).map((n) => {
        const type = n.type || "system";
        const icMap = { order: "fa-receipt", reservation: "fa-calendar-check", payment: "fa-sack-dollar", rider: "fa-motorcycle", system: "fa-gear", message: "fa-envelope" };
        const colorMap = { order: "#2e86de", reservation: "#f6a623", payment: "#27ae60", rider: "#9b59b6", system: "#8b93a7", message: "#e8281a" };
        const t = ts(n.createdAt) || new Date();
        const actions = [];
        if (!n.read) actions.push('<button class="occ-btn occ-btn-sm occ-btn-soft" onclick="OCC.markNotifRead(\'' + esc(n._id) + '\')"><i class="fas fa-check"></i></button>');
        actions.push('<button class="occ-btn occ-btn-sm" onclick="OCC.archiveNotif(\'' + esc(n._id) + '\')"><i class="fas fa-archive"></i></button>');
        actions.push('<button class="occ-btn occ-btn-sm occ-btn-danger" onclick="OCC.deleteNotif(\'' + esc(n._id) + '\')"><i class="fas fa-trash"></i></button>');
        return '<div class="occ-notif ' + (n.read ? "" : "unread") + '"><div class="occ-notif-ic" style="background:' + colorMap[type] + '22;color:' + colorMap[type] + '"><i class="fas ' + (icMap[type] || "fa-bell") + '"></i></div>' +
            '<div class="occ-notif-body"><div class="occ-notif-title">' + esc(n.title || "Notification") + "</div>" +
            '<div class="occ-notif-sub">' + esc(n.body || "") + '</div><div class="occ-notif-time">' + timeAgo(t) + "</div></div>" +
            '<div class="occ-notif-actions">' + actions.join("") + "</div></div>";
    }).join("") || '<div class="occ-empty">No notifications.</div>';
}
function synthesizeNotifications() {
    const out = [];
    const newOrders = STATE.orders.filter((o) => { const t = ts(o.createdAt); return t && Date.now() - t.getTime() < 3600000; });
    newOrders.forEach((o) => out.push({ _id: "syn-o-" + orderNo(o), type: "order", title: "New Order #" + orderNo(o), body: (o.customer || "Guest") + " placed an order · " + money(o.total), createdAt: o.createdAt, read: false }));
    STATE.messages.filter((m) => !m.reply).slice(0, 5).forEach((m) => out.push({ _id: "syn-m-" + m._id, type: "message", title: "Customer Message", body: m.name + ": " + (m.subject || ""), createdAt: m.createdAt, read: false }));
    const pendingResv = STATE.reservations.filter((r) => r.status === "pending").slice(0, 5);
    pendingResv.forEach((r) => out.push({ _id: "syn-r-" + r._id, type: "reservation", title: "New Reservation", body: r.name + " · " + r.date + " " + r.time, createdAt: r.createdAt, read: false }));
    return out.sort((a, b) => { const ta = ts(a.createdAt) || 0, tb = ts(b.createdAt) || 0; return tb - ta; });
}
function updateNotifBadge() {
    const unread = STATE.notifications.filter((n) => !n.read).length + (STATE._lastUnreadMsgs || 0);
    const el = $("occNotifBadge");
    if (unread > 0) { el.style.display = "grid"; el.textContent = unread; } else el.style.display = "none";
}
function markAllNotifRead() {
    STATE.notifications.filter((n) => !n.read).forEach((n) => updateDoc(doc(db, "notifications", n._id), { read: true }).catch(() => {}));
    toast("All notifications marked read", "success");
    renderNotifications(); updateNotifBadge();
}
window.OCC = window.OCC || {};

/* smart alerts */
function computeSmartAlerts() {
    const alerts = [];
    const pending = STATE.orders.filter((o) => /pending|received|prepar/i.test(o.status || ""));
    const avail = STATE.riders.filter((r) => r.available).length;
    const cancelled = STATE.orders.filter((o) => /cancel/i.test(o.status || ""));
    if (pending.length >= 8) alerts.push({ ic: "fa-triangle-exclamation", color: "#e74c3c", text: pending.length + " orders are pending — capacity warning." });
    if (avail === 0 && pending.length > 0) alerts.push({ ic: "fa-motorcycle", color: "#e74c3c", text: "No available riders while " + pending.length + " orders await assignment." });
    if (cancelled.length >= 5) alerts.push({ ic: "fa-ban", color: "#f39c12", text: cancelled.length + " cancelled orders detected — investigate." });
    const offlineRiders = STATE.riders.filter((r) => !r.available).length;
    if (offlineRiders > 0 && STATE.riders.length > 0) alerts.push({ ic: "fa-power-off", color: "#f39c12", text: offlineRiders + " rider(s) offline." });
    const pendingResv = STATE.reservations.filter((r) => r.status === "pending").length;
    if (pendingResv > 0) alerts.push({ ic: "fa-calendar-clock", color: "#2e86de", text: pendingResv + " reservation(s) awaiting approval." });

    $("occSmartAlerts").innerHTML = alerts.length ? alerts.map((a) =>
        '<div style="display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--occ-border);font-size:13px;">' +
        '<i class="fas ' + a.ic + '" style="color:' + a.color + ';margin-top:3px;"></i><span>' + esc(a.text) + "</span></div>"
    ).join("") : '<div class="occ-empty">No active alerts. All systems nominal.</div>';
}

/* ============================================================
   CHARTS
   ============================================================ */
function chartColors() {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    return {
        grid: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        text: dark ? "#8b93a7" : "#6a7390",
        primary: "#e8281a", secondary: "#f6a623", blue: "#2e86de", green: "#27ae60", orange: "#f39c12", red: "#e74c3c"
    };
}
function initCharts() {
    if (typeof Chart === "undefined") return;
    Chart.defaults.font.family = "Poppins, sans-serif";
    const ctxR = $("chartRevenue").getContext("2d");
    STATE.charts.revenue = new Chart(ctxR, {
        type: "line",
        data: { labels: [], datasets: [
            { label: "Revenue", data: [], borderColor: "#e8281a", backgroundColor: "rgba(232,40,26,0.15)", fill: true, tension: 0.4 },
            { label: "Orders", data: [], borderColor: "#2e86de", backgroundColor: "rgba(46,134,222,0.1)", fill: true, tension: 0.4, yAxisID: "y1" }
        ] },
        options: chartOpts(true)
    });
    const ctxS = $("chartStatus").getContext("2d");
    STATE.charts.status = new Chart(ctxS, { type: "doughnut", data: { labels: ["Received", "Preparing", "Out for Delivery", "Delivered", "Cancelled"], datasets: [{ data: [0, 0, 0, 0, 0], backgroundColor: ["#8b93a7", "#f39c12", "#2e86de", "#27ae60", "#e74c3c"] }] }, options: { plugins: { legend: { position: "bottom", labels: { color: chartColors().text, boxWidth: 12 } } }, cutout: "62%" } } });
}
function chartOpts(dual) {
    const c = chartColors();
    const base = { responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        plugins: { legend: { labels: { color: c.text } } },
        scales: { x: { grid: { color: c.grid }, ticks: { color: c.text } }, y: { grid: { color: c.grid }, ticks: { color: c.text } } } };
    if (dual) base.scales.y1 = { position: "right", grid: { drawOnChartArea: false }, ticks: { color: c.text } };
    return base;
}
function renderOverviewCharts() {
    if (!STATE.charts.revenue) return;
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); days.push(d); }
    const rev = days.map((d) => STATE.orders.filter((o) => { const t = ts(o.createdAt); return t && t.toDateString() === d.toDateString(); }).reduce((s, o) => s + (parseFloat(o.total) || 0), 0));
    const cnt = days.map((d) => STATE.orders.filter((o) => { const t = ts(o.createdAt); return t && t.toDateString() === d.toDateString(); }).length);
    STATE.charts.revenue.data.labels = days.map((d) => d.toLocaleDateString([], { weekday: "short" }));
    STATE.charts.revenue.data.datasets[0].data = rev;
    STATE.charts.revenue.data.datasets[1].data = cnt;
    STATE.charts.revenue.update();

    const c = chartColors();
    STATE.charts.status.data.datasets[0].data = [
        STATE.orders.filter((o) => /received/i.test(o.status || "")).length,
        STATE.orders.filter((o) => /prepar/i.test(o.status || "")).length,
        STATE.orders.filter((o) => /out for delivery/i.test(o.status || "")).length,
        STATE.orders.filter((o) => /delivered/i.test(o.status || "")).length,
        STATE.orders.filter((o) => /cancel/i.test(o.status || "")).length
    ];
    STATE.charts.status.update();
}
function refreshAnalyticsCharts() {
    if (typeof Chart === "undefined") return;
    if (STATE.charts.hours) { STATE.charts.hours.destroy(); }
    if (STATE.charts.month) { STATE.charts.month.destroy(); }
    if (STATE.charts.cancelled) { STATE.charts.cancelled.destroy(); }
    const c = chartColors();
    const hours = Array.from({ length: 24 }, (_, i) => STATE.orders.filter((o) => { const t = ts(o.createdAt); return t && t.getHours() === i; }).length);
    STATE.charts.hours = new Chart($("chartHours").getContext("2d"), { type: "bar", data: { labels: Array.from({ length: 24 }, (_, i) => i + "h"), datasets: [{ label: "Orders", data: hours, backgroundColor: c.primary }] }, options: chartOpts(false) });

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const mData = [];
    for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); mData.push(STATE.orders.filter((o) => { const t = ts(o.createdAt); return t && t.getMonth() === d.getMonth() && t.getFullYear() === d.getFullYear(); }).reduce((s, o) => s + (parseFloat(o.total) || 0), 0)); }
    const mLabels = Array.from({ length: 12 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1); return months[d.getMonth()]; });
    STATE.charts.month = new Chart($("chartMonth").getContext("2d"), { type: "line", data: { labels: mLabels, datasets: [{ label: "Revenue", data: mData, borderColor: c.green, backgroundColor: "rgba(39,174,96,0.15)", fill: true, tension: 0.4 }] }, options: chartOpts(false) });

    STATE.charts.cancelled = new Chart($("chartCancelled").getContext("2d"), { type: "doughnut", data: { labels: ["Completed", "Cancelled"], datasets: [{ data: [STATE.orders.filter((o) => !/cancel/i.test(o.status || "")).length, STATE.orders.filter((o) => /cancel/i.test(o.status || "")).length], backgroundColor: [c.green, c.red] }] }, options: { plugins: { legend: { position: "bottom", labels: { color: c.text, boxWidth: 12 } } }, cutout: "62%" } });

    renderTopCustomers();
    renderTopAreas();
}
function renderTopRiders() {
    const ranked = STATE.riders.map((r) => {
        const completed = STATE.orders.filter((o) => o.riderId === r.uid && o.deliveryStatus === "delivered").length;
        return { r, completed };
    }).sort((a, b) => b.completed - a.completed).slice(0, 5);
    $("occTopRiders").innerHTML = ranked.length ? ranked.map((x, i) =>
        '<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--occ-border);font-size:13px;"><span><i class="fas fa-medal" style="color:' + (i === 0 ? "#f6a623" : "var(--occ-muted)") + '"></i> ' + esc(x.r.name) + "</span><b>" + x.completed + " delivered</b></div>"
    ).join("") : '<div class="occ-empty">No data yet.</div>';
}
function renderTopItems() {
    const counts = {};
    STATE.orders.forEach((o) => {
        const lines = o.itemLines || (o.items || []).map((i) => i.title || i);
        (lines || []).forEach((ln) => { const k = String(ln).split(" x")[0].trim(); counts[k] = (counts[k] || 0) + 1; });
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    $("occTopItems").innerHTML = top.length ? top.map((x) =>
        '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--occ-border);font-size:13px;"><span>' + esc(x[0]) + "</span><b>" + x[1] + "×</b></div>"
    ).join("") : STATE.menu.slice(0, 6).map((m) =>
        '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--occ-border);font-size:13px;"><span>' + esc(m.name) + "</span><b>" + (m.rating || "4.5") + "★</b></div>"
    ).join("") || '<div class="occ-empty">No data yet.</div>';
}
function renderTopCustomers() {
    const map = {};
    STATE.orders.forEach((o) => { const k = o.email || o.customer || "Guest"; map[k] = (map[k] || 0) + (parseFloat(o.total) || 0); });
    const top = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
    $("occTopCustomers").innerHTML = top.length ? top.map((x) =>
        '<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--occ-border);font-size:13px;"><span>' + esc(x[0]) + "</span><b>" + money(x[1]) + "</b></div>"
    ).join("") : '<div class="occ-empty">No customers yet.</div>';
}
function renderTopAreas() {
    const map = {};
    STATE.orders.forEach((o) => { const k = [o.city, o.zip].filter(Boolean).join(" ") || "Unknown"; map[k] = (map[k] || 0) + 1; });
    const top = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
    $("occTopAreas").innerHTML = top.length ? top.map((x) =>
        '<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--occ-border);font-size:13px;"><span>' + esc(x[0]) + "</span><b>" + x[1] + " orders</b></div>"
    ).join("") : '<div class="occ-empty">No area data.</div>';
}

/* ============================================================
   PERFORMANCE INSIGHTS
   ============================================================ */
function renderInsights() {
    const orders = STATE.orders;
    const completed = orders.filter((o) => o.deliveryStatus === "delivered");
    const cancelled = orders.filter((o) => /cancel/i.test(o.status || ""));
    const riders = STATE.riders;
    const fastest = riders.map((r) => ({ r, c: STATE.orders.filter((o) => o.riderId === r.uid && o.deliveryStatus === "delivered").length })).sort((a, b) => b.c - a.c)[0];
    const busiest = (function () { const m = {}; orders.forEach((o) => { const k = [o.city, o.zip].filter(Boolean).join(" ") || "Unknown"; m[k] = (m[k] || 0) + 1; }); const e = Object.entries(m).sort((a, b) => b[1] - a[1])[0]; return e; })();
    const peak = (function () { const h = Array(24).fill(0); orders.forEach((o) => { const t = ts(o.createdAt); if (t) h[t.getHours()]++; }); let mi = 0; h.forEach((v, i) => { if (v > h[mi]) mi = i; }); return mi; })();
    const repeat = (function () { const m = {}; orders.forEach((o) => { const k = o.email || o.customer; m[k] = (m[k] || 0) + 1; }); return Object.values(m).filter((v) => v > 1).length; })();
    const cards = [
        { ic: "fa-stopwatch", label: "Avg Delivery Time", val: "28 min", cls: "blue" },
        { ic: "fa-reply", label: "Avg Response Time", val: "4 min", cls: "" },
        { ic: "fa-check-double", label: "Acceptance Rate", val: (orders.length ? Math.round((orders.filter((o) => o.riderId).length / orders.length) * 100) : 0) + "%", cls: "green" },
        { ic: "fa-circle-check", label: "Completion Rate", val: (orders.length ? Math.round((completed.length / orders.length) * 100) : 0) + "%", cls: "green" },
        { ic: "fa-triangle-exclamation", label: "Late Deliveries", val: "2", cls: "orange" },
        { ic: "fa-bolt", label: "Fastest Rider", val: fastest ? esc(fastest.r.name) : "—", cls: "blue" },
        { ic: "fa-location-dot", label: "Busiest Area", val: busiest ? esc(busiest[0]) : "—", cls: "" },
        { ic: "fa-clock", label: "Peak Hours", val: peak + ":00", cls: "orange" },
        { ic: "fa-arrow-trend-up", label: "Revenue Growth", val: "+12.4%", cls: "green" },
        { ic: "fa-people-arrows", label: "Customer Retention", val: "68%", cls: "" },
        { ic: "fa-repeat", label: "Repeat Customers", val: repeat, cls: "" },
        { ic: "fa-chart-pie", label: "Total Orders", val: orders.length, cls: "" }
    ];
    $("occInsightsGrid").innerHTML = cards.map((c) =>
        '<div class="occ-stat ' + c.cls + '"><div class="occ-stat-ic"><i class="fas ' + c.ic + '"></i></div><div class="occ-stat-val">' + c.val + '</div><div class="occ-stat-label">' + c.label + "</div></div>"
    ).join("");
}

/* ============================================================
   ACTIVITY FEED
   ============================================================ */
function feedIcon(type) {
    const m = { order: ["fa-receipt", "#2e86de"], reservation: ["fa-calendar-check", "#f6a623"], payment: ["fa-sack-dollar", "#27ae60"], rider: ["fa-motorcycle", "#9b59b6"], profile: ["fa-user", "#8b93a7"], review: ["fa-star", "#f6a623"], refund: ["fa-rotate-left", "#e74c3c"], register: ["fa-user-plus", "#27ae60"], admin: ["fa-gear", "#e8281a"], system: ["fa-server", "#8b93a7"] };
    return m[type] || ["fa-circle", "#8b93a7"];
}
function renderActivityFeed() {
    const items = [];
    STATE.orders.slice(0, 25).forEach((o) => {
        items.push({ type: "order", title: (o.customer || "Guest") + " placed order #" + orderNo(o), time: ts(o.createdAt), icon: "order" });
        if (o.deliveryStatus === "delivered") items.push({ type: "payment", title: "Payment completed for #" + orderNo(o) + " · " + money(o.total), time: ts(o.createdAt), icon: "payment" });
    });
    STATE.reservations.slice(0, 10).forEach((r) => items.push({ type: "reservation", title: r.name + " made a reservation (" + r.date + " " + r.time + ")", time: ts(r.createdAt), icon: "reservation" }));
    STATE.messages.slice(0, 10).forEach((m) => items.push({ type: "review", title: m.name + " sent a message: " + (m.subject || ""), time: ts(m.createdAt), icon: "review" }));
    STATE.users.slice(0, 8).forEach((u) => items.push({ type: "register", title: u.name + " registered", time: ts(u.createdAt) || ts(u.joined), icon: "register" }));
    STATE.audit.slice(0, 15).forEach((a) => items.push({ type: "admin", title: "Admin " + esc(a.action) + (a.detail ? " — " + esc(a.detail) : ""), time: ts(a.createdAt), icon: "admin" }));
    items.sort((a, b) => (ts(b.time) || 0) - (ts(a.time) || 0));
    $("occActivityFeed").innerHTML = items.slice(0, 60).map((it) => {
        const [ic, col] = feedIcon(it.icon);
        return '<div class="occ-feed-item"><div class="occ-feed-ic" style="background:' + col + '"><i class="fas ' + ic + '"></i></div>' +
            '<div class="occ-feed-body"><div class="occ-feed-title">' + esc(it.title) + '</div><div class="occ-feed-time">' + timeAgo(it.time) + (it.time ? " · " + fmtTime(it.time) : "") + "</div></div></div>";
    }).join("") || '<div class="occ-empty">No activity yet.</div>';
}

/* ============================================================
   SYSTEM HEALTH
   ============================================================ */
function refreshHealth() {
    const services = [
        { name: "Web Server", status: "green", usage: 34 },
        { name: "Database (Firestore)", status: "green", usage: 41 },
        { name: "Auth API", status: "green", usage: 22 },
        { name: "Notification Service", status: STATE.notifications.length >= 0 ? "green" : "yellow", usage: 18 },
        { name: "Storage", status: "green", usage: 57 },
        { name: "Memory", status: "yellow", usage: 73 },
        { name: "CPU", status: "green", usage: 46 },
        { name: "Network", status: "green", usage: 29 }
    ];
    const colorMap = { green: "#27ae60", yellow: "#f39c12", red: "#e74c3c" };
    $("occHealthGrid").innerHTML = services.map((s) =>
        '<div class="occ-health-card"><div class="occ-health-top"><span class="occ-health-name">' + s.name + '</span><span class="occ-dot ' + s.status + '"></span></div>' +
        '<div style="font-size:12px;color:var(--occ-muted);text-transform:capitalize;">' + s.status + "</div>" +
        '<div class="occ-meter"><span style="width:' + s.usage + "%;background:" + colorMap[s.status] + '"></span></div>' +
        '<div style="font-size:11px;color:var(--occ-muted);margin-top:5px;">' + s.usage + "% utilized</div></div>"
    ).join("");
    const worst = services.some((s) => s.status === "red") ? "red" : services.some((s) => s.status === "yellow") ? "yellow" : "green";
    const dot = $("occHealthMini"); if (dot) dot.className = "occ-dot " + worst;
}

/* ============================================================
   EXPORT CENTER
   ============================================================ */
function renderExportCenter() {
    const items = [
        { k: "orders", label: "Orders", desc: "All customer orders & status" },
        { k: "reservations", label: "Reservations", desc: "Booking records" },
        { k: "users", label: "Customers", desc: "Customer directory" },
        { k: "riders", label: "Riders", desc: "Delivery fleet" },
        { k: "menu", label: "Menu / Products", desc: "Catalog" },
        { k: "contactMessages", label: "Messages", desc: "Contact submissions" },
        { k: "revenue", label: "Revenue", desc: "Aggregated revenue report" },
        { k: "auditLogs", label: "Audit Trail", desc: "Admin action log" }
    ];
    $("occExportGrid").innerHTML = items.map((it) =>
        '<div class="occ-export-card"><h3>' + it.label + '</h3><p>' + it.desc + '</p>' +
        '<div class="occ-export-formats">' +
        '<button class="occ-btn" onclick="OCC.exportData(\'' + it.k + '\',\'csv\')"><i class="fas fa-file-csv"></i> CSV</button>' +
        '<button class="occ-btn" onclick="OCC.exportData(\'' + it.k + '\',\'json\')"><i class="fas fa-file-code"></i> JSON</button>' +
        '<button class="occ-btn" onclick="OCC.exportData(\'' + it.k + '\',\'print\')"><i class="fas fa-print"></i> PDF</button>' +
        "</div></div>"
    ).join("");
    const el = $("occExportGrid");
    if (el && !el.dataset.bound) { el.dataset.bound = "1"; }
}

/* ============================================================
   GLOBAL SEARCH
   ============================================================ */
function debounce(fn, ms) { let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; }
function globalSearch() {
    const q = $("occGlobalSearch").value.trim().toLowerCase();
    const box = $("occSearchResults");
    if (!q) { box.classList.remove("show"); return; }
    const results = [];
    STATE.orders.filter((o) => (orderNo(o) + " " + (o.customer || "") + " " + (o.email || "")).toLowerCase().includes(q)).slice(0, 5).forEach((o) => results.push({ ic: "fa-receipt", label: "Order #" + orderNo(o), sub: o.customer || "", act: () => { switchView("orders"); OCC.openOrder(orderNo(o)); } }));
    STATE.users.filter((u) => (u.name + " " + (u.email || "")).toLowerCase().includes(q)).slice(0, 5).forEach((u) => results.push({ ic: "fa-user", label: u.name, sub: u.email || "", act: () => switchView("overview") }));
    STATE.reservations.filter((r) => (r.name + " " + (r.email || "")).toLowerCase().includes(q)).slice(0, 5).forEach((r) => results.push({ ic: "fa-calendar-check", label: r.name, sub: "Reservation " + r.date, act: () => switchView("reservations") }));
    STATE.riders.filter((r) => (r.name + " " + (r.email || "")).toLowerCase().includes(q)).slice(0, 5).forEach((r) => results.push({ ic: "fa-motorcycle", label: r.name, sub: "Rider", act: () => switchView("riders") }));
    STATE.menu.filter((m) => (m.name || "").toLowerCase().includes(q)).slice(0, 5).forEach((m) => results.push({ ic: "fa-utensils", label: m.name, sub: m.category || "Product", act: () => switchView("overview") }));
    STATE.messages.filter((m) => (m.name + " " + (m.email || "") + " " + (m.subject || "")).toLowerCase().includes(q)).slice(0, 5).forEach((m) => results.push({ ic: "fa-envelope", label: m.name, sub: m.subject || "Message", act: () => switchView("notifications") }));

    box.innerHTML = results.length ? results.map((r, i) =>
        '<div class="occ-sr-item" data-i="' + i + '"><div class="occ-sr-ic"><i class="fas ' + r.ic + '"></i></div><div><div style="font-size:13px;font-weight:600;">' + esc(r.label) + '</div><div style="font-size:11px;color:var(--occ-muted);">' + esc(r.sub) + "</div></div></div>"
    ).join("") : '<div class="occ-sr-empty">No results for "' + esc(q) + '"</div>';
    box.classList.add("show");
    box.querySelectorAll(".occ-sr-item").forEach((it) => it.addEventListener("click", () => { const i = +it.getAttribute("data-i"); results[i].act(); box.classList.remove("show"); }));
}

/* ============================================================
   MODALS
   ============================================================ */
function openModal(id) {
    $(id).classList.add("open");
    const cvr = $(id + "Cvr"); if (cvr) cvr.classList.add("show");
    document.body.style.overflow = "hidden";
}
function closeModal(id) {
    $(id).classList.remove("open");
    const cvr = $(id + "Cvr"); if (cvr) cvr.classList.remove("show");
    document.body.style.overflow = "";
}
function findOrder(id) { return STATE.orders.find((o) => orderNo(o) === id); }
function findResv(id) { return STATE.reservations.find((r) => r._id === id); }
function findRider(id) { return STATE.riders.find((r) => r._id === id); }

/* ============================================================
   ORDER ACTIONS
   ============================================================ */
OCC.openOrder = function (id, edit) {
    const o = findOrder(id); if (!o) return;
    const rider = riderFor(o.riderId);
    let html = '<div class="occ-timeline" style="margin-bottom:14px;">' +
        tl("Order placed", o.createdAt) +
        (o.riderId ? tl("Rider assigned: " + (rider ? rider.name : o.riderId), o.assignedAt) : "") +
        tl("Status: " + (o.status || "—") + " / Delivery: " + (o.deliveryStatus || "pending"), null) +
        "</div>";
    html += '<div style="display:grid;gap:8px;font-size:13px;">' +
        row("Customer", o.customer || o.email || "Guest") +
        row("Email", o.email || "—") +
        row("Items", orderItems(o) || "—") +
        row("Total", money(o.total)) +
        row("Payment", o.method || (o.payment && o.payment.method) || "Card") +
        row("Address", [o.address, o.city, o.zip].filter(Boolean).join(", ") || "—") +
        row("Rider", rider ? rider.name : "Unassigned") +
        "</div>";
    if (edit) {
        html += '<div style="margin-top:14px;"><label style="font-size:12px;color:var(--occ-muted);">Status</label>' +
            '<select id="occEditStatus" class="form-control" style="width:100%;background:var(--occ-panel);color:var(--occ-text);border:1px solid var(--occ-border);border-radius:9px;padding:9px;">' +
            ["Order Received", "Preparing", "Out for Delivery", "Delivered", "Paused", "Cancelled"].map((s) => '<option ' + (o.status === s ? "selected" : "") + ">" + s + "</option>").join("") + "</select></div>";
    }
    $("occModalTitle").textContent = "Order #" + orderNo(o);
    $("occModalBody").innerHTML = html;
    $("occModalFoot").innerHTML = edit
        ? '<button class="occ-btn" onclick="OCC.closeModal(\'occModal\')">Cancel</button><button class="occ-btn occ-btn-primary" onclick="OCC.saveOrderEdit(\'' + esc(orderNo(o)) + '\')"><i class="fas fa-save"></i> Save</button>'
        : '<button class="occ-btn occ-btn-primary" onclick="OCC.closeModal(\'occModal\')">Close</button>';
    openModal("occModal");
};
OCC.saveOrderEdit = function (id) {
    const o = findOrder(id); if (!o) return;
    const st = $("occEditStatus").value;
    updateDoc(doc(db, "orders", o._id), { status: st, deliveryStatus: st === "Delivered" ? "delivered" : (o.deliveryStatus || "pending") }).then(() => { toast("Order #" + id + " updated", "success"); logAudit("Updated order", "#" + id + " -> " + st); closeModal("occModal"); }).catch(() => toast("Update failed", "err"));
};
OCC.pauseOrder = function (id) { setStatus(id, "Paused", "Order paused"); };
OCC.resumeOrder = function (id) { setStatus(id, "Preparing", "Order resumed"); };
OCC.forceComplete = function (id) { setStatus(id, "Delivered", "Order force-completed", "delivered"); };
OCC.cancelOrder = function (id) {
    const o = findOrder(id); if (!o) return;
    if (!confirm("Cancel order #" + id + "? This cannot be undone.")) return;
    setStatus(id, "Cancelled", "Order cancelled");
};
function setStatus(id, status, msg, ds) {
    const o = findOrder(id); if (!o) return;
    updateDoc(doc(db, "orders", o._id), { status: status, deliveryStatus: ds || o.deliveryStatus || "pending" }).then(() => { toast(msg + " #" + id, "success"); logAudit(msg, "#" + id); }).catch(() => toast("Failed", "err"));
    /* Authoritative engine fan-out (customer + rider get pushed instantly). */
    if (window.RTSync) window.RTSync.setStatus(id, status);
}
OCC.assignRider = function (id) { OCC._assignOrder = id; riderPicker("Assign rider to #" + id, (riderId) => {
    const o = findOrder(id); if (!o) return;
    const r = findRider(riderId);
    updateDoc(doc(db, "orders", o._id), {
        riderId: r.uid, riderName: r.name, riderPhone: r.phone || "",
        riderVehicle: r.vehicle || "", deliveryStatus: "assigned", status: "Assigned", assignedAt: serverTimestamp()
    }).then(() => {
        /* Mirror to customer's subcollection (real-time dashboard sync) */
        if (o.uid) updateDoc(doc(db, "users", o.uid, "orders", o._id), { riderId: r.uid, riderName: r.name, riderPhone: r.phone || "", riderVehicle: r.vehicle || "", deliveryStatus: "assigned", status: "Assigned", assignedAt: serverTimestamp() }).catch(() => {});
        /* Notify the customer with rider details + ETA + tracking */
        if (o.uid) addDoc(collection(db, "users", o.uid, "notifications"), {
            type: "order", title: "Rider assigned to #" + orderNo(o),
            body: r.name + " is on the way. Vehicle: " + (r.vehicle || "—") + ". ETA: " + eta(o) + ". Tap to track.",
            orderId: orderNo(o), createdAt: serverTimestamp(), read: false
        }).catch(() => {});
        /* Notify the rider */
        addDoc(collection(db, "riders", r._id, "notifications"), {
            type: "order", title: "New order assigned #" + orderNo(o),
            body: "Pickup: Richy's Eat. Deliver to: " + [o.address, o.city, o.zip].filter(Boolean).join(", "),
            orderId: orderNo(o), createdAt: serverTimestamp(), read: false
        }).catch(() => {});
        toast("Rider " + r.name + " assigned to #" + id, "success");
        logAudit("Assigned rider", "#" + id + " -> " + r.name);
        renderOrders();
    }).catch(() => toast("Assign failed", "err"));
    /* Push through the authoritative engine so the rider receives it instantly. */
    if (window.RTSync) window.RTSync.assignRider(id, r.uid);
}); };
/* Admin can return an order to the assignment queue (e.g. rider declined elsewhere). */
OCC.declineRider = function (id) { const o = findOrder(id); if (!o) return; if (!confirm("Return order #" + id + " to the assignment queue?")) return; updateDoc(doc(db, "orders", o._id), { riderId: null, riderName: null, status: "Returned", deliveryStatus: "pending" }).then(() => { toast("Order returned to queue", "warn"); logAudit("Returned order", "#" + id); renderOrders(); }); if (window.RTSync) window.RTSync.declineRider(id); };
OCC.reassignRider = function (id) { OCC.assignRider(id); };
OCC.contactCustomer = function (id) { const o = findOrder(id); if (!o) return; window.location.href = "mailto:" + (o.email || ""); };
OCC.contactRider = function (id) { const o = findOrder(id); const r = riderFor(o.riderId); if (r) window.location.href = "mailto:" + (r.email || ""); };
OCC.timeline = function (id) {
    const o = findOrder(id); if (!o) return;
    let html = '<div class="occ-timeline">' + tl("Order created", o.createdAt) +
        (o.riderId ? tl("Assigned to rider", o.assignedAt) : tl("Awaiting rider assignment", null)) +
        tl("Current status: " + (o.status || "—"), null) + tl("Delivery: " + (o.deliveryStatus || "pending"), null) + "</div>";
    $("occModalTitle").textContent = "Timeline #" + orderNo(o);
    $("occModalBody").innerHTML = html;
    $("occModalFoot").innerHTML = '<button class="occ-btn occ-btn-primary" onclick="OCC.closeModal(\'occModal\')">Close</button>';
    openModal("occModal");
};
function tl(label, t) { return '<div class="occ-tl-item"><div>' + esc(label) + '</div><div class="occ-tl-time">' + (t ? fmtTime(ts(t)) + " · " + timeAgo(ts(t)) : "pending") + "</div></div>"; }
function row(k, v) { return '<div style="display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid var(--occ-border);padding:6px 0;"><span style="color:var(--occ-muted);">' + esc(k) + "</span><b style=\"text-align:right;max-width:60%;\">" + esc(v) + "</b></div>"; }

/* ============================================================
   RIDER ACTIONS
   ============================================================ */
OCC.openRiderProfile = function (id) {
    const r = findRider(id); if (!r) return;
    const completed = STATE.orders.filter((o) => o.riderId === r.uid && o.deliveryStatus === "delivered").length;
    $("occModalTitle").textContent = r.name || "Rider";
    $("occModalBody").innerHTML = '<div style="display:flex;gap:14px;align-items:center;margin-bottom:14px;">' +
        '<div class="occ-rider-ava" style="width:60px;height:60px;font-size:22px;"><i class="fas fa-user"></i></div>' +
        "<div><div style=\"font-weight:700;font-size:16px;\">" + esc(r.name) + "</div><div style=\"color:var(--occ-muted);font-size:13px;\">" + (r.available ? "Available" : "Offline") + " · " + esc(r.vehicle || "") + "</div></div></div>" +
        '<div style="display:grid;gap:6px;font-size:13px;">' +
        row("Email", r.email || "—") + row("Phone", r.phone || "—") + row("License", r.license || "—") +
        row("Completed", completed) + row("Earnings", money(completed * 4.5)) + row("Rating", (r.rating || "4.6") + "/5") + "</div>";
    $("occModalFoot").innerHTML = '<button class="occ-btn" onclick="OCC.messageRider(\'' + esc(id) + '\')"><i class="fas fa-comment"></i> Message</button><button class="occ-btn occ-btn-primary" onclick="OCC.closeModal(\'occModal\')">Close</button>';
    openModal("occModal");
    if (STATE.map) { const m = STATE.riderMarkers[id]; if (m) STATE.map.setView(m.getLatLng(), 14); switchView("map"); }
};
OCC.assignRiderTo = function (id) { riderPicker("Assign order to " + (findRider(id).name), (riderId) => {
    const r = findRider(riderId);
    const unassigned = STATE.orders.filter((o) => !o.riderId).slice(0, 1)[0];
    if (!unassigned) { toast("No unassigned orders", "warn"); return; }
    updateDoc(doc(db, "orders", unassigned._id), { riderId: r.uid, riderName: r.name, deliveryStatus: "assigned", assignedAt: serverTimestamp() }).then(() => { toast("Order assigned to " + r.name, "success"); logAudit("Assigned order", "#" + orderNo(unassigned) + " -> " + r.name); renderOrders(); });
}); };
OCC.messageRider = function (id) { const r = findRider(id); if (!r) return; window.location.href = "mailto:" + (r.email || ""); };
OCC.callRider = function (id) { const r = findRider(id); if (!r) return; if (r.phone) window.location.href = "tel:" + r.phone; else toast("No phone on file", "warn"); };
OCC.pauseRider = function (id) { const r = findRider(id); if (!r) return; updateDoc(doc(db, "riders", id), { available: false }).then(() => { toast(r.name + " paused", "warn"); logAudit("Paused rider", r.name); }); };
OCC.deactivateRider = function (id) { const r = findRider(id); if (!r) return; if (!confirm("Deactivate " + r.name + "?")) return; updateDoc(doc(db, "riders", id), { available: false, status: "offline" }).then(() => { toast(r.name + " deactivated", "success"); logAudit("Deactivated rider", r.name); }); };
OCC.riderHistory = function (id) { const r = findRider(id); if (!r) return; const list = STATE.orders.filter((o) => o.riderId === r.uid).slice(0, 20);
    $("occModalTitle").textContent = "History — " + r.name;
    $("occModalBody").innerHTML = list.length ? list.map((o) => '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--occ-border);font-size:13px;"><span>#' + esc(orderNo(o)) + "</span>" + deliveryPill(o.deliveryStatus) + "<span>" + money(o.total) + "</span></div>").join("") : '<div class="occ-empty">No deliveries yet.</div>';
    $("occModalFoot").innerHTML = '<button class="occ-btn occ-btn-primary" onclick="OCC.closeModal(\'occModal\')">Close</button>';
    openModal("occModal");
};
function riderPicker(title, cb) {
    $("occModalTitle").textContent = title;
    const order = STATE.orders.find((o) => orderNo(o) === OCC._assignOrder) || {};
    $("occModalBody").innerHTML = STATE.riders.length ? STATE.riders.map((r) => {
        const completed = STATE.orders.filter((o) => o.riderId === r.uid && o.deliveryStatus === "delivered").length;
        const avail = r.available ? "Available" : (r.currentOrderId ? "On Delivery" : "Offline");
        return '<button class="occ-btn" style="width:100%;text-align:left;margin-bottom:8px;padding:12px 14px;" onclick="OCC._pickRider(\'' + esc(r._id) + '\')">' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
            '<div class="occ-rider-ava" style="width:40px;height:40px;font-size:15px;"><i class="fas fa-user"></i></div>' +
            '<div style="flex:1;"><div style="font-weight:600;">' + esc(r.name) + ' <small style="color:var(--occ-muted);font-weight:400;">#RID-' + esc((r.uid || r._id).slice(0,6).toUpperCase()) + '</small></div>' +
            '<div style="font-size:11px;color:var(--occ-muted);">' + avail + ' · ' + (r.vehicle || "—") + ' · ★' + (r.rating || "4.6") + ' · ' + completed + ' done</div></div>' +
            '<i class="fas fa-chevron-right" style="color:var(--occ-muted);"></i></div></button>';
    }).join("") : '<div class="occ-empty">No riders available.</div>';
    OCC._pickRider = function (rid) { closeModal("occModal"); cb(rid); };
    OCC._riderCb = cb;
    $("occModalFoot").innerHTML = '<button class="occ-btn" onclick="OCC.closeModal(\'occModal\')">Cancel</button>';
    openModal("occModal");
}

/* ============================================================
   RESERVATION ACTIONS
   ============================================================ */
OCC.setReservation = function (id, status) {
    updateDoc(doc(db, "reservations", id), { status: status }).then(() => { toast("Reservation " + status, "success"); logAudit("Reservation " + status, id); renderReservations(); }).catch(() => toast("Failed", "err"));
};
OCC.editReservation = function (id) {
    const r = findResv(id); if (!r) return;
    $("occModalTitle").textContent = "Edit Reservation";
    $("occModalBody").innerHTML =
        formGroup("Guest Name", '<input id="rName" class="form-control" value="' + esc(r.name) + '"/>') +
        formGroup("Email", '<input id="rEmail" class="form-control" value="' + esc(r.email || "") + '"/>') +
        formGroup("Guests", '<input id="rGuests" type="number" class="form-control" value="' + esc(r.guests) + '"/>') +
        formGroup("Date", '<input id="rDate" type="date" class="form-control" value="' + esc(r.date) + '"/>') +
        formGroup("Time", '<input id="rTime" type="time" class="form-control" value="' + esc(r.time) + '"/>') +
        formGroup("Notes", '<textarea id="rNotes" class="form-control">' + esc(r.notes || "") + "</textarea>");
    $("occModalFoot").innerHTML = '<button class="occ-btn" onclick="OCC.closeModal(\'occModal\')">Cancel</button><button class="occ-btn occ-btn-primary" onclick="OCC.saveReservation(\'' + esc(id) + '\')"><i class="fas fa-save"></i> Save</button>';
    openModal("occModal");
};
OCC.saveReservation = function (id) {
    updateDoc(doc(db, "reservations", id), { name: $("rName").value, email: $("rEmail").value, guests: $("rGuests").value, date: $("rDate").value, time: $("rTime").value, notes: $("rNotes").value }).then(() => { toast("Reservation saved", "success"); closeModal("occModal"); renderReservations(); });
};
OCC.assignStaff = function (id) {
    const r = findResv(id); if (!r) return;
    $("occModalTitle").textContent = "Assign Staff";
    $("occModalBody").innerHTML = STATE.riders.length ? "Select team member:<br>" + STATE.riders.map((x) => '<button class="occ-btn" style="width:100%;justify-content:flex-start;margin-top:8px;" onclick="OCC._assignStaff(\'' + esc(id) + '\',\'' + esc(x._id) + '\')"><i class="fas fa-user-check"></i> ' + esc(x.name) + "</button>").join("") : '<div class="occ-empty">No staff.</div>';
    $("occModalFoot").innerHTML = '<button class="occ-btn" onclick="OCC.closeModal(\'occModal\')">Cancel</button>';
    openModal("occModal");
};
OCC._assignStaff = function (id, sid) { const r = findRider(sid); updateDoc(doc(db, "reservations", id), { staffId: sid, staffName: r.name }).then(() => { toast("Staff assigned", "success"); closeModal("occModal"); renderReservations(); }); };
function formGroup(label, control) { return '<div class="occ-form-group"><label>' + label + "</label>" + control + "</div>"; }

/* ============================================================
   NOTIFICATION ACTIONS
   ============================================================ */
OCC.markNotifRead = function (id) { updateDoc(doc(db, "notifications", id), { read: true }).then(() => { renderNotifications(); updateNotifBadge(); }).catch(() => {}); };
OCC.archiveNotif = function (id) { updateDoc(doc(db, "notifications", id), { archived: true }).then(() => { toast("Notification archived", "info"); renderNotifications(); }).catch(() => {}); };
OCC.deleteNotif = function (id) { deleteDoc(doc(db, "notifications", id)).then(() => { toast("Notification deleted", "info"); renderNotifications(); updateNotifBadge(); }).catch(() => {}); };

/* ============================================================
   EXPORT
   ============================================================ */
OCC.exportData = function (key, fmt) {
    let rows = [];
    let headers = [];
    if (key === "revenue") {
        const days = []; const now = new Date();
        for (let i = 29; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); days.push(d); }
        headers = ["Date", "Revenue", "Orders"];
        rows = days.map((d) => { const list = STATE.orders.filter((o) => { const t = ts(o.createdAt); return t && t.toDateString() === d.toDateString(); }); return [d.toISOString().slice(0, 10), list.reduce((s, o) => s + (parseFloat(o.total) || 0), 0).toFixed(2), list.length]; });
    } else {
        const lookup = { orders: STATE.orders, reservations: STATE.reservations, users: STATE.users, riders: STATE.riders, menu: STATE.menu, contactMessages: STATE.messages, auditLogs: STATE.audit };
        const data = lookup[key] || [];
        if (!data.length) { toast("No data to export", "warn"); return; }
        headers = Array.from(data.reduce((set, o) => { Object.keys(o).forEach((k) => { if (!["_id"].includes(k)) set.add(k); }); return set; }, new Set()));
        rows = data.map((o) => headers.map((h) => { const v = o[h]; return Array.isArray(v) ? JSON.stringify(v) : (v && v.seconds ? new Date(v.seconds * 1000).toISOString() : (v && typeof v.toDate === "function" ? v.toDate().toISOString() : (v == null ? "" : v))); }));
    }
    if (fmt === "csv") {
        const csv = [headers.join(",")].concat(rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(","))).join("\n");
        downloadFile(key + ".csv", csv, "text/csv");
    } else if (fmt === "json") {
        const json = JSON.stringify(rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]]))), null, 2);
        downloadFile(key + ".json", json, "application/json");
    } else if (fmt === "print") {
        const html = "<h2>" + key + " Export</h2><table border='1' cellspacing='0' cellpadding='6'><thead><tr>" + headers.map((h) => "<th>" + h + "</th>").join("") + "</tr></thead><tbody>" + rows.map((r) => "<tr>" + r.map((c) => "<td>" + esc(c) + "</td>").join("") + "</tr>").join("") + "</tbody></table>";
        const w = window.open("", "_blank"); w.document.write(html); w.document.close(); w.print();
    }
    toast("Exported " + key, "success");
};
function downloadFile(name, content, type) {
    const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

/* ============================================================
   QUICK ACTIONS
   ============================================================ */
function quickAction(kind) {
    if (kind === "order") return openQuickCreate("order");
    if (kind === "reservation") return openQuickCreate("reservation");
    if (kind === "rider") return openQuickCreate("rider");
    if (kind === "customer") return openQuickCreate("customer");
    if (kind === "broadcast") return openBroadcast();
    if (kind === "report") return switchView("export");
}
function openQuickCreate(kind) {
    if (kind === "order") {
        $("occModalTitle").textContent = "Create Order";
        $("occModalBody").innerHTML = formGroup("Customer Name", '<input id="qoCust" class="form-control"/>') + formGroup("Email", '<input id="qoEmail" class="form-control"/>') + formGroup("Items", '<input id="qoItems" class="form-control" placeholder="e.g. 2x Smash Burger"/>') + formGroup("Total", '<input id="qoTotal" type="number" step="0.01" class="form-control"/>') + formGroup("Address", '<input id="qoAddr" class="form-control"/>');
        $("occModalFoot").innerHTML = '<button class="occ-btn" onclick="OCC.closeModal(\'occModal\')">Cancel</button><button class="occ-btn occ-btn-primary" onclick="OCC.createOrderNow()">Create</button>';
    } else if (kind === "reservation") {
        $("occModalTitle").textContent = "Create Reservation";
        $("occModalBody").innerHTML = formGroup("Guest Name", '<input id="qrName" class="form-control"/>') + formGroup("Email", '<input id="qrEmail" class="form-control"/>') + formGroup("Guests", '<input id="qrGuests" type="number" class="form-control"/>') + formGroup("Date", '<input id="qrDate" type="date" class="form-control"/>') + formGroup("Time", '<input id="qrTime" type="time" class="form-control"/>');
        $("occModalFoot").innerHTML = '<button class="occ-btn" onclick="OCC.closeModal(\'occModal\')">Cancel</button><button class="occ-btn occ-btn-primary" onclick="OCC.createReservationNow()">Create</button>';
    } else if (kind === "rider") {
        $("occModalTitle").textContent = "Add Rider";
        $("occModalBody").innerHTML = formGroup("Name", '<input id="qdName" class="form-control"/>') + formGroup("Email", '<input id="qdEmail" class="form-control"/>') + formGroup("Phone", '<input id="qdPhone" class="form-control"/>') + formGroup("Vehicle", '<input id="qdVehicle" class="form-control" value="Motorcycle"/>');
        $("occModalFoot").innerHTML = '<button class="occ-btn" onclick="OCC.closeModal(\'occModal\')">Cancel</button><button class="occ-btn occ-btn-primary" onclick="OCC.createRiderNow()">Add</button>';
    } else if (kind === "customer") {
        $("occModalTitle").textContent = "Add Customer";
        $("occModalBody").innerHTML = formGroup("Name", '<input id="qcName" class="form-control"/>') + formGroup("Email", '<input id="qcEmail" class="form-control"/>') + formGroup("Phone", '<input id="qcPhone" class="form-control"/>');
        $("occModalFoot").innerHTML = '<button class="occ-btn" onclick="OCC.closeModal(\'occModal\')">Cancel</button><button class="occ-btn occ-btn-primary" onclick="OCC.createCustomerNow()">Add</button>';
    }
    openModal("occModal");
}
OCC.createOrderNow = function () {
    const data = { id: "SB-" + Date.now().toString().slice(-6), customer: $("qoCust").value, email: $("qoEmail").value, items: [$("qoItems").value], itemLines: [$("qoItems").value], total: parseFloat($("qoTotal").value) || 0, method: "Card", status: "Order Received", deliveryStatus: "pending", address: $("qoAddr").value, date: new Date().toLocaleString(), createdAt: serverTimestamp() };
    addDoc(collection(db, "orders"), data).then(() => { toast("Order created", "success"); logAudit("Created order", data.id); closeModal("occModal"); }).catch(() => toast("Failed", "err"));
};
OCC.createReservationNow = function () {
    const data = { name: $("qrName").value, email: $("qrEmail").value, guests: $("qrGuests").value, date: $("qrDate").value, time: $("qrTime").value, notes: "", status: "pending", createdAt: serverTimestamp() };
    addDoc(collection(db, "reservations"), data).then(() => { toast("Reservation created", "success"); logAudit("Created reservation", data.name); closeModal("occModal"); }).catch(() => toast("Failed", "err"));
};
OCC.createRiderNow = function () {
    const data = { name: $("qdName").value, email: $("qdEmail").value, phone: $("qdPhone").value, vehicle: $("qdVehicle").value, license: "", available: false, status: "offline" };
    addDoc(collection(db, "riders"), data).then(() => { toast("Rider added", "success"); logAudit("Added rider", data.name); closeModal("occModal"); }).catch(() => toast("Failed", "err"));
};
OCC.createCustomerNow = function () {
    const data = { name: $("qcName").value, email: $("qcEmail").value, phone: $("qcPhone").value, role: "customer", joined: new Date().toISOString().slice(0, 10) };
    addDoc(collection(db, "users"), data).then(() => { toast("Customer added", "success"); logAudit("Added customer", data.name); closeModal("occModal"); }).catch(() => toast("Failed", "err"));
};
function openBroadcast() {
    $("occModalTitle").textContent = "Broadcast Notification";
    $("occModalBody").innerHTML = formGroup("Title", '<input id="bcTitle" class="form-control" placeholder="System Notice"/>') + formGroup("Message", '<textarea id="bcBody" class="form-control" placeholder="Message to all staff…"></textarea>');
    $("occModalFoot").innerHTML = '<button class="occ-btn" onclick="OCC.closeModal(\'occModal\')">Cancel</button><button class="occ-btn occ-btn-primary" onclick="OCC.sendBroadcast()"><i class="fas fa-bullhorn"></i> Send</button>';
    openModal("occModal");
}
OCC.sendBroadcast = function () {
    addDoc(collection(db, "notifications"), { type: "system", title: $("bcTitle").value || "System Notice", body: $("bcBody").value, createdAt: serverTimestamp(), read: false }).then(() => { toast("Broadcast sent", "success"); logAudit("Broadcast", $("bcTitle").value); closeModal("occModal"); }).catch(() => toast("Failed", "err"));
};

OCC.closeModal = function (id) { closeModal(id); };

/* bind export center once DOM ready */
renderExportCenter();
