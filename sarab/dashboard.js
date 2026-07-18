/* ============================================================
   UNIFIED DASHBOARD — role-based (admin / rider / customer)
   Real Firestore backend. Replaces the mock `DB` object.
   ============================================================ */
import {
    app, auth, db,
    ADMIN_EMAIL, ADMIN_NAME, isAdmin,
    ORDER_STATUS, ORDER_STATUS_ALT, ALL_STATUSES,
    canTransition, normalizeStatus, deliveryStatusFor,
    collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
    query, orderBy, where, serverTimestamp,
    notify, logActivity, saveOrder, updateOrder, pushStatusHistory
} from './js/firebase-shared.js';

/* ===== helpers ===== */
function $(id){ return document.getElementById(id); }
function esc(s){ return (s==null?"":String(s)); }
function money(n){ return "$" + (parseFloat(n)||0).toFixed(2); }
function statusClass(status){
    var s = normalizeStatus(status);
    if (s === 'On The Way') return "bg-delivery";
    if (s === 'Pending' || s === 'Order Received') return "bg-pending";
    if (s === 'Preparing') return "bg-preparing";
    if (s === 'Delivered' || s === 'Completed') return "bg-delivered";
    if (s === 'Approved') return "bg-approved";
    if (s === 'Rejected' || s === 'Cancelled') return "bg-declined";
    if (s === 'Assigned' || s === 'Rider Accepted' || s === 'Picked Up') return "bg-delivery";
    if (s === 'Paused') return "bg-pending";
    return "bg-pending";
}
function dbToast(msg, type){
    type = type || "success";
    var c = $("dbToastContainer");
    if (!c) return;
    var el = document.createElement("div");
    el.className = "db-toast " + type;
    var ic = type==="success" ? "fa-check-circle" : (type==="err" ? "fa-times-circle" : "fa-info-circle");
    el.innerHTML = '<i class="fas '+ic+'"></i>' + msg;
    c.appendChild(el);
    setTimeout(function(){ el.remove(); }, 3200);
}

/* ============================================================
   AUTH + ROLE
   ============================================================ */
onAuthStateChanged(auth, function(user){
    if (!user){
        window.location.href = "../sarab/index.html";
        return;
    }
    authUser = user;
    DB.user.email = user.email || "";
    DB.user.name = user.displayName || (user.email ? user.email.split("@")[0] : "User");

    determineRole(user);
});

function determineRole(user){
    connectDashboardSync(user);
    if (user.email === ADMIN_EMAIL || user.displayName === ADMIN_NAME){
        DB.role = "admin";
        setupShell();
        return;
    }
    getDocs(collection(db, "riders")).then(function(snap){
        var found = null;
        snap.forEach(function(d){
            if (d.data().uid === user.uid){ found = d.data(); found.id = d.id; }
        });
        if (found){
            DB.role = "rider";
            riderDoc = found;
            DB.user.name = found.name || DB.user.name;
            DB.user.phone = found.phone || "";
            DB.user.vehicle = found.vehicle || "";
            DB.user.license = found.license || "";
            applyRole("rider");
            setupShell();
        } else {
            DB.role = "customer";
            applyRole("customer");
            setupShell();
        }
    }).catch(function(){
        DB.role = "customer";
        applyRole("customer");
        setupShell();
    });
}

/* Real-time sync: connect the unified dashboard to the WebSocket
   server so admin / rider / customer views update instantly. Falls
   back to the existing Firestore loads when the socket is down. */
function connectDashboardSync(user){
    if (typeof RTSync === "undefined" || !user) return;
    var isAd = (user.email === ADMIN_EMAIL || user.displayName === ADMIN_NAME);
    var role = isAd ? "admin" : (DB.role === "rider" ? "rider" : "customer");
    RTSync.connect({ uid: user.uid, email: user.email, role: role });
    RTSync.on("order:created", function(o){ if (o) liveReloadOrders(o); });
    RTSync.on("order:updated", function(o){ if (o) liveReloadOrders(o); });
    RTSync.on("order:status", function(p){ if (p) liveReloadOrders(p); });
    RTSync.on("order:assigned", function(o){ if (o) liveReloadOrders(o); });
    RTSync.on("order:declined", function(p){ if (p) liveReloadOrders(p); });
    RTSync.on("notification", function(n){ if (n) dbToast((n.title||"Update") + (n.body?": "+n.body:""), "info"); });
    RTSync.on("fallback", function(){ /* rely on loadData() one-time fetch */ });
}
function liveReloadOrders(o){
    if (DB.role === "customer"){
        /* Customers only see their own orders (security enforced server-side too) */
        if (!o || (o.uid && o.uid !== authUser.uid)) return;
    }
    if (DB.role === "rider" && o && o.riderId && o.riderId !== authUser.uid && o.riderUid !== authUser.uid) return;
    loadOrders();
}

/* ============================================================
   SHELL SETUP (listeners)
   ============================================================ */
function setupShell(){
    /* section switching */
    document.querySelectorAll(".db-nav-item").forEach(function(item){
        item.addEventListener("click", function(e){
            e.preventDefault();
            var sec = item.getAttribute("data-section");
            if (sec) showSection(sec);
        });
    });
    document.querySelectorAll(".db-link").forEach(function(l){
        l.addEventListener("click", function(e){ e.preventDefault(); var s=l.getAttribute("data-section"); if(s) showSection(s); });
    });
    $("dbToggle") && $("dbToggle").addEventListener("click", function(){ $("dbSidebar").classList.toggle("show"); });

    /* modal close wiring */
    document.querySelectorAll(".db-modal-close").forEach(function(b){
        b.addEventListener("click", function(){ closeModal(b.getAttribute("data-close")); });
    });
    document.querySelectorAll(".db-modal-cvr").forEach(function(c){
        c.addEventListener("click", function(){ var id=c.id.replace("Cvr",""); closeModal(id); });
    });
    document.addEventListener("keydown", function(e){
        if (e.key==="Escape") document.querySelectorAll(".db-modal.open").forEach(function(m){ closeModal(m.id); });
    });

    /* logout */
    $("dbLogout") && $("dbLogout").addEventListener("click", function(){
        signOut(auth).then(function(){ window.location.href = "../sarab/index.html"; });
    });
    $("dbNotif") && $("dbNotif").addEventListener("click", function(){ showSection("messages"); });

    /* orders filter */
    $("orderStatusFilter") && $("orderStatusFilter").addEventListener("change", renderOrders);

    /* menu modal */
    $("addMenuItemBtn") && $("addMenuItemBtn").addEventListener("click", openMenuModal);
    $("menuItemForm") && $("menuItemForm").addEventListener("submit", function(e){
        e.preventDefault();
        saveMenuItem();
    });

    /* rider modal */
    $("addRiderBtn") && $("addRiderBtn").addEventListener("click", openRiderModal);
    $("riderForm") && $("riderForm").addEventListener("submit", function(e){
        e.preventDefault();
        saveRider();
    });

    /* message reply */
    $("messageReplyForm") && $("messageReplyForm").addEventListener("submit", function(e){
        e.preventDefault();
        dbToast("Reply sent to " + $("replyToEmail").value, "success");
        closeModal("messageModal");
    });

    /* user modal */
    $("addUserBtn") && $("addUserBtn").addEventListener("click", openUserModal);
    $("userForm") && $("userForm").addEventListener("submit", function(e){
        e.preventDefault();
        saveUser();
    });

    /* profile */
    $("profileForm") && $("profileForm").addEventListener("submit", function(e){
        e.preventDefault();
        saveProfile();
    });

    /* settings */
    $("settingsForm") && $("settingsForm").addEventListener("submit", function(e){
        e.preventDefault();
        dbToast("Settings saved", "success");
    });

    /* chat */
    $("chatSend") && $("chatSend").addEventListener("click", sendChatMessage);
    $("chatInput") && $("chatInput").addEventListener("keydown", function(e){
        if (e.key === "Enter") sendChatMessage();
    });

    /* mark all notifications read */
    $("markAllNotifRead") && $("markAllNotifRead").addEventListener("click", function(){
        DB.notifications.forEach(function(n) {
            if (!n.read) markNotificationRead(n._id);
        });
        dbToast("All notifications marked as read", "success");
    });

    /* rider availability toggle */
    $("dbStatusBtn") && $("dbStatusBtn").addEventListener("click", function(){
        if (!riderDoc) return;
        var on = !riderDoc.available;
        updateDoc(doc(db, "riders", riderDoc.id), { available: on }).then(function(){
            riderDoc.available = on;
            $("dbStatusBtn").classList.toggle("available", on);
            $("dbStatusText").textContent = on ? "Available" : "Offline";
            dbToast(on ? "You are now available for deliveries" : "You went offline", on ? "success" : "warn");
        });
    });

    /* load all data */
    loadData();
}

/* ============================================================
    DATA LOADING
    ============================================================ */
function loadData(){
    loadOrders();
    loadReservations();
    loadMenu();
    loadUsers();
    loadRiders();
    loadMessages();
    loadNotifications();
}


function loadOrders(){
    getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"))).then(function(snap){
        DB.orders = [];
        snap.forEach(function(d){
            var o = d.data();
            o._id = d.id;
            DB.orders.push(o);
        });
        renderAll();
    }).catch(function(){ dbToast("Could not load orders", "err"); });
}
function loadReservations(){
    getDocs(query(collection(db, "reservations"), orderBy("createdAt", "desc"))).then(function(snap){
        DB.reservations = [];
        snap.forEach(function(d){ var r = d.data(); r._id = d.id; DB.reservations.push(r); });
        renderAll();
    }).catch(function(){});
}
function loadMenu(){
    getDocs(query(collection(db, "menu"), orderBy("name", "asc"))).then(function(snap){
        DB.menu = [];
        snap.forEach(function(d){ var m = d.data(); m._id = d.id; DB.menu.push(m); });
        renderAll();
    }).catch(function(){});
}
function loadUsers(){
    getDocs(query(collection(db, "users"), orderBy("name", "asc"))).then(function(snap){
        DB.users = [];
        snap.forEach(function(d){ var u = d.data(); u._id = d.id; DB.users.push(u); });
        renderAll();
    }).catch(function(){});
}
function loadRiders(){
    getDocs(query(collection(db, "riders"), orderBy("name", "asc"))).then(function(snap){
        DB.riders = [];
        snap.forEach(function(d){ var r = d.data(); r._id = d.id; DB.riders.push(r); });
        renderAll();
    }).catch(function(){});
}
function loadMessages(){
    getDocs(query(collection(db, "contactMessages"), orderBy("createdAt", "desc"))).then(function(snap){
        DB.messages = [];
        snap.forEach(function(d){ var m = d.data(); m._id = d.id; DB.messages.push(m); });
        renderAll();
    }).catch(function(){});
}

/* ============================================================
   ROLE APPLICATION
   ============================================================ */
function applyRole(role){
    DB.role = role;
    var roleMeta = {
        admin:   { name:"Administrator", icon:"fa-user-shield", sub:"Admin Panel" },
        rider:   { name:"Delivery Partner", icon:"fa-motorcycle", sub:"Rider Panel" },
        customer:{ name:"Customer", icon:"fa-user", sub:"Customer Panel" }
    }[role] || { name:"User", icon:"fa-user", sub:"" };

    document.querySelectorAll("#dbNav .db-nav-item").forEach(function(item){
        var allowed = (item.getAttribute("data-role")||"").split(",");
        item.style.display = allowed.indexOf(role)>=0 ? "" : "none";
    });
    document.querySelectorAll("[data-role]").forEach(function(el){
        if (el.closest("#dbNav")) return;
        var r = el.getAttribute("data-role");
        el.style.display = (r==="all" || r===role) ? "" : "none";
    });

    $("dbUserName").textContent = DB.user.name;
    $("dbUserRole").textContent = roleMeta.name;
    $("dbRoleLabel").textContent = roleMeta.sub;
    $("dbAvatar").innerHTML = '<i class="fas '+roleMeta.icon+'"></i>';
    $("riderStatusWrap").style.display = (role==="rider") ? "" : "none";

    if (role==="rider" && riderDoc){
        $("dbStatusBtn").classList.toggle("available", !!riderDoc.available);
        $("dbStatusText").textContent = riderDoc.available ? "Available" : "Offline";
    }

    var riderCol = $("colRider");
    if (riderCol) riderCol.style.display = (role==="customer") ? "none" : "";

    $("dashTitle").textContent = roleMeta.name + " Dashboard";
    $("dashSub").textContent = "Welcome back" + (DB.user.name?", "+DB.user.name:"") + "! Here's your overview.";

    $("profileName").value = DB.user.name;
    $("profileEmail").value = DB.user.email;
    $("profilePhone").value = DB.user.phone || "";
    $("profileVehicleGroup").style.display = (role==="rider") ? "" : "none";
    $("profileLicenseGroup").style.display = (role==="rider") ? "" : "none";
    if (role==="rider"){ $("profileVehicle").value = DB.user.vehicle; $("profileLicense").value = DB.user.license; }

    $("recentMessagesCard").style.display = (role==="admin") ? "" : "none";
    $("recentActivityCard").style.display = (role==="rider") ? "" : "none";

    renderAll();
    showSection("dashboard");
}

/* ============================================================
   SECTION SWITCHING
   ============================================================ */
function showSection(sec){
    document.querySelectorAll(".db-section").forEach(function(s){ s.classList.remove("active"); });
    var target = $("section-" + sec);
    if (target) target.classList.add("active");
    document.querySelectorAll(".db-nav-item").forEach(function(n){
        n.classList.toggle("active", n.getAttribute("data-section")===sec);
    });
    $("dbSidebar").classList.remove("show");
    if (sec==="dashboard") renderDashboard();
    if (sec==="notifications") { loadNotifications(); renderNotifications(); }
    if (sec==="chat") loadChat();
}

/* ============================================================
   RENDER: DASHBOARD
   ============================================================ */
function renderDashboard(){
    var role = DB.role;
    var stats = [], grid = "";
    if (role==="admin"){
        stats = [
            { icon:"fa-receipt", label:"Total Orders", val: DB.orders.length },
            { icon:"fa-clock", label:"Pending Orders", val: DB.orders.filter(function(o){return (o.status==="Order Received"||o.status==="Preparing");}).length },
            { icon:"fa-motorcycle", label:"Out for Delivery", val: DB.orders.filter(function(o){return o.status==="Out for Delivery";}).length },
            { icon:"fa-calendar-alt", label:"Reservations", val: DB.reservations.length },
            { icon:"fa-dollar-sign", label:"Revenue", val: money(DB.orders.reduce(function(s,o){return s+(parseFloat(o.total)||0);},0)) },
            { icon:"fa-users", label:"Customers", val: DB.users.length },
            { icon:"fa-motorcycle", label:"Riders", val: DB.riders.length },
            { icon:"fa-envelope", label:"Messages", val: DB.messages.length }
        ];
        } else if (role==="rider"){
        var my = DB.orders.filter(function(o){ return o.riderId===authUser.uid; });
        stats = [
            { icon:"fa-box-open", label:"Available Orders", val: DB.orders.filter(function(o){return (!o.riderId) && (normalizeStatus(o.status)==="Preparing"||normalizeStatus(o.status)==="Pending"||o.deliveryStatus==="pending");}).length },
            { icon:"fa-route", label:"My Deliveries", val: my.length },
            { icon:"fa-check-circle", label:"Completed", val: my.filter(function(o){return o.deliveryStatus==="delivered";}).length },
            { icon:"fa-dollar-sign", label:"Earnings", val: money(my.reduce(function(s,o){return s+(parseFloat(o.total)||0)*0.1;},0)) }
        ];
    }
 else {
        var mine = DB.orders.filter(function(o){ return o.email===DB.user.email || o.uid===authUser.uid; });
        var activeOrders = mine.filter(function(o){ return !/delivered|completed|cancelled/i.test(normalizeStatus(o.status)); }).length;
        stats = [
            { icon:"fa-receipt", label:"My Orders", val: mine.length },
            { icon:"fa-clock", label:"Active Orders", val: activeOrders },
            { icon:"fa-dollar-sign", label:"Total Spent", val: money(mine.reduce(function(s,o){return s+(parseFloat(o.total)||0);},0)) },
            { icon:"fa-calendar-alt", label:"Reservations", val: DB.reservations.length },
            { icon:"fa-heart", label:"Wishlist", val: 3 }
        ];
    }
    $("dashStats").innerHTML = stats.map(function(s){
        return '<div class="stat-card"><div class="stat-icon"><i class="fas '+s.icon+'"></i></div>'+
               '<div class="stat-info"><h3>'+s.val+'</h3><p>'+s.label+'</p></div></div>';
    }).join("");

    var ro = DB.orders.slice(0,5).map(function(o){
        return '<tr><td>'+esc(orderNo(o))+'</td><td>'+esc(o.customer||o.email||"Guest")+'</td><td>'+money(o.total)+'</td>'+
               '<td><span class="badge-pill '+statusClass(o.status)+'">'+esc(o.status)+'</span></td></tr>';
    }).join("");
    $("recentOrdersTable").innerHTML = ro || '<tr><td colspan="4" class="text-muted">No orders</td></tr>';

    var rr = DB.reservations.slice(0,5).map(function(r){
        return '<tr><td>'+esc(r.name)+'</td><td>'+esc(r.date)+'</td><td>'+esc(r.time)+'</td><td>'+esc(r.guests)+'</td></tr>';
    }).join("");
    $("recentReservationsTable").innerHTML = rr || '<tr><td colspan="4" class="text-muted">No reservations</td></tr>';

    if (role==="admin"){
        var rm = DB.messages.slice(0,5).map(function(m){
            return '<tr><td>'+esc(m.name)+'</td><td>'+esc(m.subject)+'</td><td>'+esc(m.date||m.createdAt)+'</td></tr>';
        }).join("");
        $("recentMessagesTable").innerHTML = rm || '<tr><td colspan="3" class="text-muted">No messages</td></tr>';
    }

    if (role==="rider"){
        var ra = DB.orders.filter(function(o){return o.riderId===authUser.uid;}).slice(0,5).map(function(o){
            return '<tr><td>'+esc(orderNo(o))+'</td><td>'+esc(o.customer||o.email||"Guest")+'</td><td>'+money(o.total)+'</td>'+
                   '<td><span class="badge-pill '+statusClass(o.deliveryStatus)+'">'+esc(o.deliveryStatus)+'</span></td><td>'+esc(o.date||"")+'</td></tr>';
        }).join("");
        $("recentActivityTable").innerHTML = ra || '<tr><td colspan="5" class="text-muted">No activity</td></tr>';
    }

    if (role==="admin"){
        $("analyticsStats").innerHTML = stats.map(function(s){
            return '<div class="stat-card"><div class="stat-icon"><i class="fas '+s.icon+'"></i></div>'+
                   '<div class="stat-info"><h3>'+s.val+'</h3><p>'+s.label+'</p></div></div>';
        }).join("");
    }
}

/* ============================================================
   RENDER: ORDERS
   ============================================================ */
function orderNo(o){ return o.id || o._id || ""; }
function orderItems(o){
    if (o.items && Array.isArray(o.items)) return o.items.map(function(i){ return i.title || i; }).join(", ");
    if (o.itemLines && Array.isArray(o.itemLines)) return o.itemLines.join(", ");
    return o.items || "";
}
function renderOrders(){
    var role = DB.role;
    var filter = $("orderStatusFilter") ? $("orderStatusFilter").value : "all";
    var list = DB.orders.filter(function(o){
        if (role==="customer") return (o.email===DB.user.email || o.uid===authUser.uid);
        if (role==="rider") return (o.riderId===authUser.uid || (!o.riderId));
        if (filter!=="all") return o.status===filter;
        return true;
    });
    $("allOrdersTable").innerHTML = list.map(function(o){
        var actions = '<button class="db-btn db-btn-sm db-btn-outline" onclick="openOrderModal(\''+esc(orderNo(o))+'\')"><i class="fas fa-eye"></i> View</button>';
        if (role==="rider" && !o.riderId && (o.status==="Preparing"||o.status==="Order Received"||o.deliveryStatus==="pending")){
            actions += ' <button class="db-btn db-btn-sm db-btn-primary" onclick="acceptOrder(\''+esc(orderNo(o))+'\')"><i class="fas fa-check"></i> Accept</button>';
        }
        if (role==="rider" && o.deliveryStatus==="assigned" && o.riderId===authUser.uid){
            actions += ' <button class="db-btn db-btn-sm db-btn-success" onclick="riderAdvance(\''+esc(orderNo(o))+'\',\'picked_up\')"><i class="fas fa-box"></i> Pick Up</button>';
        } else if (role==="rider" && o.deliveryStatus==="picked_up" && o.riderId===authUser.uid){
            actions += ' <button class="db-btn db-btn-sm db-btn-success" onclick="riderAdvance(\''+esc(orderNo(o))+'\',\'delivered\')"><i class="fas fa-check"></i> Deliver</button>';
        }
        var statusSel = (role==="admin") ?
            '<select class="db-status-select" onchange="updateOrderStatus(\''+esc(orderNo(o))+'\',this.value)">'+
            ['Pending','Approved','Assigned','Preparing','Picked Up','On The Way','Near Customer','Delivered','Completed','Paused','Cancelled'].map(function(s){
                return '<option '+(normalizeStatus(o.status)===s?'selected':'')+'>'+s+'</option>'; }).join("")+'</select>' :
            '<span class="badge-pill '+statusClass(o.status)+'">'+esc(o.status)+'</span>';
        return '<tr><td>'+esc(orderNo(o))+'</td><td>'+esc(o.customer||o.email||"Guest")+'<br/><small>'+esc(o.email||"")+'</small></td>'+
            '<td>'+esc(orderItems(o))+'</td><td>'+money(o.total)+'</td><td>'+esc(o.method||o.payment||"Card")+'</td>'+
            '<td>'+statusSel+'</td>'+
            (role==="customer"?'':'<td>'+esc(o.riderName||o.rider||"—")+'</td>')+
            '<td><span class="badge-pill '+statusClass(o.deliveryStatus)+'">'+esc(o.deliveryStatus||"pending")+'</span></td>'+
            '<td>'+esc(o.date||"")+'</td><td>'+actions+'</td></tr>';
    }).join("") || '<tr><td colspan="10" class="text-muted">No orders found</td></tr>';

    var pending = DB.orders.filter(function(o){ return /pending|received|prepar/i.test(normalizeStatus(o.status)); }).length;
    setBadge("ordersBadge", pending);
}
function findOrderDoc(id){
    for (var i=0;i<DB.orders.length;i++){ if (orderNo(DB.orders[i])===id) return DB.orders[i]; }
    return null;
}
function updateOrderStatus(id, status){
    var o = findOrderDoc(id);
    if (!o){ return; }
    var ref = doc(db, "orders", o._id);
    var nextStatus = normalizeStatus(status);
    if (!canTransition(normalizeStatus(o.status), nextStatus)) {
        dbToast("Invalid status transition: " + o.status + " -> " + status, "err");
        return;
    }
    var changes = { status: nextStatus, deliveryStatus: deliveryStatusFor(nextStatus) };
    updateDoc(ref, changes).then(function(){
        dbToast("Order "+id+" updated to "+nextStatus, "success");
        Object.assign(o, changes);
        renderOrders(); renderDashboard();
    }).catch(function(){ dbToast("Update failed", "err"); });
    if (window.RTSync) window.RTSync.setStatus(id, nextStatus);
}
function acceptOrder(id){
    var o = findOrderDoc(id);
    if (!o){ return; }
    if (o.riderId){ dbToast("Already assigned", "err"); return; }
    var ref = doc(db, "orders", o._id);
    updateDoc(ref, {
        riderId: authUser.uid,
        riderName: DB.user.name,
        deliveryStatus: "assigned",
        status: "Rider Accepted",
        assignedAt: serverTimestamp()
    }).then(function(){
        dbToast("You accepted order "+id, "success");
        loadOrders();
    }).catch(function(){ dbToast("Accept failed", "err"); });
    if (window.RTSync) window.RTSync.setStatus(id, "Rider Accepted");
}
function riderAdvance(id, status){
    var o = findOrderDoc(id);
    if (!o){ return; }
    var ref = doc(db, "orders", o._id);
    var nextStatus = status === "picked_up" ? "Picked Up" : (status === "delivered" ? "Delivered" : status);
    var changes = { deliveryStatus: status, status: nextStatus };
    if (status === "delivered") changes.completedAt = serverTimestamp();
    updateDoc(ref, changes).then(function(){
        dbToast("Order "+id+" marked "+status, "success");
        loadOrders();
    }).catch(function(){ dbToast("Update failed", "err"); });
    if (window.RTSync) window.RTSync.setStatus(id, nextStatus);
}

/* ============================================================
   RENDER: RESERVATIONS
   ============================================================ */
function renderReservations(){
    var role = DB.role;
    var list = DB.reservations;
    $("allReservationsTable").innerHTML = list.map(function(r){
        var actions = '<button class="db-btn db-btn-sm db-btn-outline" onclick="openReservationModal(\''+esc(orderNo(r))+'\')"><i class="fas fa-eye"></i> View</button>';
        if (role==="admin" && r.status==="pending"){
            actions += ' <button class="db-btn db-btn-sm db-btn-success" onclick="setReservation(\''+esc(orderNo(r))+'\',\'approved\')"><i class="fas fa-check"></i></button>'+
                       ' <button class="db-btn db-btn-sm db-btn-danger" onclick="setReservation(\''+esc(orderNo(r))+'\',\'declined\')"><i class="fas fa-times"></i></button>';
        }
        return '<tr><td>'+esc(r.name)+'</td><td>'+esc(r.email)+'</td><td>'+esc(r.phone)+'</td><td>'+esc(r.guests)+'</td>'+
            '<td>'+esc(r.date)+'</td><td>'+esc(r.time)+'</td><td>'+esc(r.notes)+'</td>'+
            '<td><span class="badge-pill '+statusClass(r.status)+'">'+esc(r.status)+'</span></td><td>'+actions+'</td></tr>';
    }).join("") || '<tr><td colspan="9" class="text-muted">No reservations</td></tr>';
    setBadge("resvBadge", DB.reservations.filter(function(r){return r.status==="pending";}).length);
}
function setReservation(id, status){
    var r = DB.reservations.find(function(x){return orderNo(x)===id;});
    if (!r){ return; }
    updateDoc(doc(db, "reservations", r._id), { status: status }).then(function(){
        dbToast("Reservation "+id+" "+status, "success");
        loadReservations();
    }).catch(function(){ dbToast("Update failed", "err"); });
}
function openReservationModal(id){
    var r = DB.reservations.find(function(x){return orderNo(x)===id;});
    if (!r) return;
    $("reservationModalBody").innerHTML =
        '<div class="order-detail-grid">'+
        '<div class="order-detail-item"><strong>Guest</strong>'+esc(r.name)+'</div>'+
        '<div class="order-detail-item"><strong>Email</strong>'+esc(r.email)+'</div>'+
        '<div class="order-detail-item"><strong>Phone</strong>'+esc(r.phone)+'</div>'+
        '<div class="order-detail-item"><strong>Guests</strong>'+esc(r.guests)+'</div>'+
        '<div class="order-detail-item"><strong>Date</strong>'+esc(r.date)+'</div>'+
        '<div class="order-detail-item"><strong>Time</strong>'+esc(r.time)+'</div>'+
        '</div>'+
        '<div class="order-detail-item" style="margin-top:12px;"><strong>Notes</strong>'+esc(r.notes)+'</div>'+
        '<div class="order-detail-item" style="margin-top:12px;"><strong>Status</strong><span class="badge-pill '+statusClass(r.status)+'">'+esc(r.status)+'</span></div>';
    openModal("reservationModal");
}

/* ============================================================
   RENDER: MENU
   ============================================================ */
function renderMenu(){
    $("menuTable").innerHTML = DB.menu.map(function(m){
        var actions = (DB.role==="admin") ?
            '<button class="db-btn db-btn-sm db-btn-outline" onclick="editMenuItem(\''+esc(m._id)+'\')"><i class="fas fa-edit"></i></button>'+
            ' <button class="db-btn db-btn-sm db-btn-danger" onclick="deleteMenuItem(\''+esc(m._id)+'\')"><i class="fas fa-trash"></i></button>' :
            '<span class="text-muted">View only</span>';
        return '<tr><td><img src="'+esc(m.image||m.img||"img/menu/1.jpg")+'" style="width:44px;height:44px;object-fit:cover;border-radius:8px;" onerror="this.src=\'img/menu/1.jpg\'"/></td>'+
            '<td>'+esc(m.name)+'</td><td>'+esc(m.category)+'</td><td>'+money(m.price)+'</td><td>'+esc(m.rating||"0")+'</td><td>'+actions+'</td></tr>';
    }).join("") || '<tr><td colspan="6" class="text-muted">No menu items</td></tr>';
}
function openMenuModal(){
    $("menuModalTitle").textContent = "Add Menu Item";
    $("menuItemForm").reset();
    $("menuItemId").value = "";
    openModal("menuModal");
}
function editMenuItem(id){
    var m = DB.menu.find(function(x){return x._id===id;});
    if (!m) return;
    $("menuModalTitle").textContent = "Edit Menu Item";
    $("menuItemId").value = m._id;
    $("menuItemName").value = m.name || "";
    $("menuItemCategory").value = m.category || "";
    $("menuItemPrice").value = m.price || "";
    $("menuItemImage").value = m.image || m.img || "";
    $("menuItemDesc").value = m.desc || m.description || "";
    openModal("menuModal");
}
function deleteMenuItem(id){
    var m = DB.menu.find(function(x){return x._id===id;});
    if (!m) return;
    deleteDoc(doc(db, "menu", id)).then(function(){
        dbToast("Menu item deleted", "success");
        loadMenu();
    }).catch(function(){ dbToast("Delete failed", "err"); });
}
function saveMenuItem(){
    var id = $("menuItemId").value;
    var data = {
        name: $("menuItemName").value,
        category: $("menuItemCategory").value,
        price: parseFloat($("menuItemPrice").value),
        image: $("menuItemImage").value || "img/menu/1.jpg",
        rating: "5.0",
        desc: $("menuItemDesc").value
    };
    if (id){
        updateDoc(doc(db, "menu", id), data).then(function(){
            dbToast("Item updated", "success");
            closeModal("menuModal");
            loadMenu();
            logActivity({ type: "menu_updated", detail: data.name || id });
        });
    } else {
        addDoc(collection(db, "menu"), data).then(function(){
            dbToast("Item added", "success");
            closeModal("menuModal");
            loadMenu();
            logActivity({ type: "menu_created", detail: data.name || "new item" });
        });
    }
}

/* ============================================================
   RENDER: USERS
   ============================================================ */
function renderUsers(){
    $("usersTable").innerHTML = DB.users.map(function(u){
        return '<tr><td>'+esc(u.name)+'</td><td>'+esc(u.email)+'</td><td>'+esc(u.phone||"")+'</td><td>'+esc(u.joined||"")+'</td>'+
            '<td><button class="db-btn db-btn-sm db-btn-outline" onclick="editUser(\''+esc(u._id)+'\')"><i class="fas fa-edit"></i></button>'+
            ' <button class="db-btn db-btn-sm db-btn-danger" onclick="deleteUser(\''+esc(u._id)+'\')"><i class="fas fa-trash"></i></button></td></tr>';
    }).join("") || '<tr><td colspan="5" class="text-muted">No users</td></tr>';
}
function openUserModal(){
    $("userModalTitle").textContent = "Add User";
    $("userForm").reset();
    $("userId").value = "";
    openModal("userModal");
}
function editUser(id){
    var u = DB.users.find(function(x){return x._id===id;});
    if (!u) return;
    $("userModalTitle").textContent = "Edit User";
    $("userId").value = u._id;
    $("userName").value = u.name || "";
    $("userEmail").value = u.email || "";
    $("userPhone").value = u.phone || "";
    $("userRoleSelect").value = u.role || "customer";
    openModal("userModal");
}
function deleteUser(id){
    if (!confirm("Delete this user?")) return;
    deleteDoc(doc(db, "users", id)).then(function(){
        dbToast("User deleted", "success");
        loadUsers();
        logActivity({ type: "user_deleted", detail: id });
    }).catch(function(){ dbToast("Delete failed", "err"); });
}
function saveUser(){
    var id = $("userId").value;
    var data = {
        name: $("userName").value,
        email: $("userEmail").value,
        phone: $("userPhone").value,
        role: $("userRoleSelect").value,
        joined: new Date().toISOString().slice(0,10)
    };
    if (id){
        updateDoc(doc(db, "users", id), data).then(function(){
            dbToast("User updated", "success");
            closeModal("userModal");
            loadUsers();
            logActivity({ type: "user_updated", detail: data.name || id });
        });
    } else {
        addDoc(collection(db, "users"), data).then(function(){
            dbToast("User added", "success");
            closeModal("userModal");
            loadUsers();
            logActivity({ type: "user_created", detail: data.name || "new user" });
        });
    }
}

/* ============================================================
   RENDER: RIDERS
   ============================================================ */
function renderRiders(){
    $("ridersTitle").textContent = (DB.role==="rider") ? "All Riders" : "Rider Management";
    $("ridersTable").innerHTML = DB.riders.map(function(r){
        var actions = (DB.role==="admin") ?
            '<button class="db-btn db-btn-sm db-btn-outline" onclick="editRider(\''+esc(r._id)+'\')"><i class="fas fa-edit"></i></button>'+
            ' <button class="db-btn db-btn-sm db-btn-danger" onclick="deleteRider(\''+esc(r._id)+'\')"><i class="fas fa-trash"></i></button>' :
            '<span class="text-muted">—</span>';
        var currentOrder = r.currentOrderId ? "#"+r.currentOrderId : "—";
        return '<tr><td>'+esc(r.name)+'</td><td>'+esc(r.email)+'</td><td>'+esc(r.phone||"")+'</td><td>'+esc(r.vehicle||"")+'</td>'+
            '<td><span class="badge-pill '+statusClass(r.available?"available":"offline")+'">'+(r.available?"Available":"Offline")+'</span></td>'+
            '<td>'+esc(currentOrder)+'</td><td>'+actions+'</td></tr>';
    }).join("") || '<tr><td colspan="7" class="text-muted">No riders</td></tr>';
}
function openRiderModal(){
    $("riderModalTitle").textContent = "Add Rider";
    $("riderForm").reset();
    $("riderId").value = "";
    openModal("riderModal");
}
function editRider(id){
    var r = DB.riders.find(function(x){return x._id===id;});
    if (!r) return;
    $("riderModalTitle").textContent = "Edit Rider";
    $("riderId").value = r._id;
    $("riderName").value = r.name || "";
    $("riderEmail").value = r.email || "";
    $("riderPhone").value = r.phone || "";
    $("riderVehicleModal").value = r.vehicle || "";
    $("riderLicenseModal").value = r.license || "";
    openModal("riderModal");
}
function deleteRider(id){
    if (!confirm("Delete this rider?")) return;
    deleteDoc(doc(db, "riders", id)).then(function(){
        dbToast("Rider removed", "success");
        loadRiders();
        logActivity({ type: "rider_deleted", detail: id });
    }).catch(function(){ dbToast("Delete failed", "err"); });
}
function saveRider(){
    var id = $("riderId").value;
    var data = {
        name: $("riderName").value,
        email: $("riderEmail").value,
        phone: $("riderPhone").value,
        vehicle: $("riderVehicleModal").value,
        license: $("riderLicenseModal").value,
        status: "offline",
        available: false
    };
    if (id){
        updateDoc(doc(db, "riders", id), data).then(function(){
            dbToast("Rider updated", "success");
            closeModal("riderModal");
            loadRiders();
            logActivity({ type: "rider_updated", detail: data.name || id });
        });
    } else {
        addDoc(collection(db, "riders"), data).then(function(){
            dbToast("Rider added", "success");
            closeModal("riderModal");
            loadRiders();
            logActivity({ type: "rider_created", detail: data.name || "new rider" });
        });
    }
}

/* ============================================================
   RENDER: MESSAGES
   ============================================================ */
function renderMessages(){
    $("messagesTable").innerHTML = DB.messages.map(function(m){
        return '<tr><td>'+esc(m.name)+'</td><td>'+esc(m.email)+'</td><td>'+esc(m.phone||"")+'</td><td>'+esc(m.subject)+'</td>'+
            '<td>'+esc(m.message)+'</td><td>'+esc(m.date||"")+'</td>'+
            '<td><button class="db-btn db-btn-sm db-btn-primary" onclick="openMessageModal(\''+esc(m._id)+'\')"><i class="fas fa-reply"></i> Reply</button></td></tr>';
    }).join("") || '<tr><td colspan="7" class="text-muted">No messages</td></tr>';
    setBadge("msgBadge", DB.messages.length);
}
function openMessageModal(id){
    var m = DB.messages.find(function(x){return x._id===id;});
    if (!m) return;
    $("replyMessageId").value = m._id;
    $("replyToEmail").value = m.email;
    $("replySubject").value = "Re: " + (m.subject||"");
    $("replyBody").value = "";
    openModal("messageModal");
}

/* ============================================================
   PROFILE
   ============================================================ */
function saveProfile(){
    if (DB.role==="rider" && riderDoc){
        updateDoc(doc(db, "riders", riderDoc.id), {
            name: $("profileName").value,
            phone: $("profilePhone").value,
            vehicle: $("profileVehicle").value,
            license: $("profileLicense").value
        }).then(function(){
            riderDoc.name = $("profileName").value;
            riderDoc.phone = $("profilePhone").value;
            DB.user.name = $("profileName").value;
            $("dbUserName").textContent = DB.user.name;
            dbToast("Profile updated", "success");
        }).catch(function(){ dbToast("Update failed", "err"); });
    } else {
        DB.user.name = $("profileName").value;
        DB.user.phone = $("profilePhone").value;
        $("dbUserName").textContent = DB.user.name;
        dbToast("Profile updated", "success");
    }
}

/* ============================================================
   BADGES + MODALS
   ============================================================ */
function setBadge(id, n){
    var el = $(id);
    if (!el) return;
    if (n>0){ el.style.display=""; el.textContent=n; if(id==="msgBadge"){ $("topNotifBadge").style.display=""; $("topNotifBadge").textContent=n; } }
    else { el.style.display="none"; if(id==="msgBadge") $("topNotifBadge").style.display="none"; }
}
function openModal(id){
    $(id).classList.add("open");
    var cvr = $(id+"Cvr");
    if (cvr) cvr.classList.add("show");
    document.body.style.overflow="hidden";
}
function closeModal(id){
    $(id).classList.remove("open");
    var cvr = $(id+"Cvr");
    if (cvr) cvr.classList.remove("show");
    document.body.style.overflow="";
}
function openOrderModal(id){
    var o = findOrderDoc(id);
    if (!o) return;
    var itemsHtml = "";
    if (o.items && Array.isArray(o.items)){
        itemsHtml = o.items.map(function(it){ return '<div class="order-item"><span>'+esc(it.title||it)+' x'+(it.qty||1)+'</span></div>'; }).join("");
    } else if (o.itemLines){
        itemsHtml = o.itemLines.map(function(line){ return '<div class="order-item"><span>'+esc(line)+'</span></div>'; }).join("");
    } else {
        itemsHtml = '<div class="order-item"><span>'+esc(o.items||"")+'</span></div>';
    }
    var statusTimeline = "";
    if (o.statusHistory && Array.isArray(o.statusHistory)) {
        statusTimeline = '<div class="order-timeline">' + o.statusHistory.map(function(h) {
            return '<div class="timeline-item"><span class="timeline-status">' + esc(h.status) + '</span>' +
                '<span class="timeline-time">' + (h.at ? new Date(h.at.seconds * 1000).toLocaleString() : '') + '</span></div>';
        }).join("") + '</div>';
    }
    var riderHtml = "";
    if (o.riderName || o.riderId) {
        riderHtml = '<div class="rider-info-card">' +
            '<div class="rider-avatar"><i class="fas fa-motorcycle"></i></div>' +
            '<div><strong>' + esc(o.riderName || 'Rider') + '</strong>' +
            '<br/><small>' + esc(o.riderVehicle || '') + '</small>' +
            (o.riderPhone ? '<br/><small><i class="fas fa-phone"></i> ' + esc(o.riderPhone) + '</small>' : '') +
            '</div></div>';
    }
    $("orderModalBody").innerHTML =
        '<div class="order-detail-grid">'+
        '<div class="order-detail-item"><strong>Order ID</strong>#'+esc(orderNo(o))+'</div>'+
        '<div class="order-detail-item"><strong>Status</strong><span class="badge-pill '+statusClass(o.status)+'">'+esc(normalizeStatus(o.status))+'</span></div>'+
        '<div class="order-detail-item"><strong>Total</strong>'+money(o.total)+'</div>'+
        '<div class="order-detail-item"><strong>Payment</strong>'+esc(o.method||o.payment||"-")+'</div>'+
        '<div class="order-detail-item"><strong>Address</strong>'+esc([o.address, o.city, o.zip].filter(Boolean).join(", ") || "—")+'</div>'+
        (riderHtml ? '<div class="order-detail-item"><strong>Assigned Rider</strong>' + riderHtml + '</div>' : '') +
        '</div>'+
        (statusTimeline ? '<h5 class="mt-4 mb-3">Order Timeline</h5>' + statusTimeline : '') +
        '<div class="order-items-list mt-3"><strong>Items</strong>'+itemsHtml+'</div>';
    openModal("orderModal");
}

/* ============================================================
   MASTER RENDER
   ============================================================ */
function renderAll(){
    renderOrders();
    renderReservations();
    renderMenu();
    renderUsers();
    renderRiders();
    renderMessages();
    renderDashboard();
}

/* ============================================================
   NOTIFICATIONS
   ============================================================ */
let notificationsUnsubscribe = null;
function loadNotifications() {
    if (notificationsUnsubscribe) notificationsUnsubscribe();
    if (DB.role === "admin") {
        getDocs(query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(50)))
            .then(function(snap) {
                DB.notifications = snap.docs.map(function(d) { var n = d.data(); n._id = d.id; return n; });
                renderNotifications();
                updateNotifBadge();
            }).catch(function() {});
    } else {
        notificationsUnsubscribe = subscribeCustomerNotifications(function(list) {
            DB.notifications = list;
            renderNotifications();
            updateNotifBadge();
        });
    }
}
function renderNotifications() {
    var list = $("notificationsList");
    if (!list) return;
    if (!DB.notifications || !DB.notifications.length) {
        list.innerHTML = '<div class="db-empty">No notifications yet</div>';
        return;
    }
    list.innerHTML = DB.notifications.slice(0, 50).map(function(n) {
        var icon = "fa-bell";
        var color = "#888";
        if (n.type === "order") { icon = "fa-receipt"; color = "#2e86de"; }
        else if (n.type === "rider") { icon = "fa-motorcycle"; color = "#9b59b6"; }
        else if (n.type === "reservation") { icon = "fa-calendar-check"; color = "#f6a623"; }
        else if (n.type === "payment") { icon = "fa-sack-dollar"; color = "#27ae60"; }
        else if (n.type === "message") { icon = "fa-envelope"; color = "#e8281a"; }
        var readClass = n.read ? "" : "unread";
        return '<div class="db-notif-item ' + readClass + '">' +
            '<div class="db-notif-icon" style="background:' + color + '22;color:' + color + '"><i class="fas ' + icon + '"></i></div>' +
            '<div class="db-notif-body"><strong>' + esc(n.title || "Notification") + '</strong>' +
            '<p>' + esc(n.body || "") + '</p>' +
            '<small>' + (n.createdAt ? new Date(n.createdAt.seconds * 1000).toLocaleString() : '') + '</small></div>' +
            (!n.read ? '<button class="db-btn db-btn-sm db-btn-soft mark-read-btn" data-id="' + esc(n._id) + '">Mark Read</button>' : '') +
            '</div>';
    }).join("");
    list.querySelectorAll('.mark-read-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var nid = this.getAttribute('data-id');
            markNotificationRead(nid);
        });
    });
}
function markNotificationRead(nid) {
    if (DB.role === "admin") {
        updateDoc(doc(db, "notifications", nid), { read: true }).catch(function() {});
    } else {
        updateDoc(doc(db, "users", authUser.uid, "notifications", nid), { read: true }).catch(function() {});
    }
    var n = DB.notifications.find(function(x) { return x._id === nid; });
    if (n) n.read = true;
    renderNotifications();
    updateNotifBadge();
}
function updateNotifBadge() {
    var unread = DB.notifications ? DB.notifications.filter(function(n) { return !n.read; }).length : 0;
    var badge = $("notifBadge");
    if (badge) {
        if (unread > 0) { badge.style.display = ""; badge.textContent = unread; }
        else badge.style.display = "none";
    }
}

/* ============================================================
   CHAT / MESSAGING
   ============================================================ */
let chatUnsub = null;
let currentChatId = null;
let chatPartners = [];

function loadChat() {
    var q;
    if (DB.role === "admin") {
        q = query(collection(db, "messages"), orderBy("createdAt", "desc"));
    } else if (DB.role === "rider") {
        q = query(collection(db, "messages"), where("senderId", "==", authUser.uid), orderBy("createdAt", "desc"));
    } else {
        q = query(collection(db, "messages"), where("senderId", "==", authUser.uid), orderBy("createdAt", "desc"));
    }
    if (chatUnsub) chatUnsub();
    chatUnsub = onSnapshot(q, function(snap) {
        var msgs = snap.docs.map(function(d) { var m = d.data(); m._id = d.id; return m; });
        renderChatList(msgs);
    }).catch(function() {});
}

function renderChatList(msgs) {
    var list = $("chatList");
    if (!list) return;
    var partners = {};
    msgs.forEach(function(m) {
        var partnerId = DB.role === "admin" ? (m.senderId === authUser.uid ? m.receiverId : m.senderId) : "admin";
        if (!partners[partnerId]) {
            partners[partnerId] = { id: partnerId, lastMsg: m.text || "", time: m.createdAt };
        }
    });
    chatPartners = Object.values(partners);
    list.innerHTML = chatPartners.map(function(p) {
        return '<div class="chat-contact" data-id="' + esc(p.id) + '">' +
            '<div class="chat-contact-name">' + esc(p.id === 'admin' ? 'Admin Support' : p.id) + '</div>' +
            '<div class="chat-contact-preview">' + esc(p.lastMsg.substring(0, 50)) + '</div>' +
            '</div>';
    }).join("") || '<div class="db-empty">No conversations yet</div>';
    list.querySelectorAll('.chat-contact').forEach(function(el) {
        el.addEventListener('click', function() {
            list.querySelectorAll('.chat-contact').forEach(function(c) { c.classList.remove('active'); });
            this.classList.add('active');
            openChat(this.getAttribute('data-id'));
        });
    });
}

function openChat(partnerId) {
    currentChatId = partnerId;
    $("chatHeader").innerHTML = '<strong>' + esc(partnerId === 'admin' ? 'Admin Support' : partnerId) + '</strong>';
    var q = query(collection(db, "messages"),
        where("senderId", "in", [authUser.uid, partnerId]),
        where("receiverId", "in", [authUser.uid, partnerId]),
        orderBy("createdAt", "asc"),
        limit(100));
    getDocs(q).then(function(snap) {
        var msgs = snap.docs.map(function(d) { return d.data(); });
        renderChatMessages(msgs);
    }).catch(function() {});
}

function renderChatMessages(msgs) {
    var container = $("chatMessages");
    if (!container) return;
    container.innerHTML = msgs.map(function(m) {
        var cls = m.senderId === authUser.uid ? "sent" : "received";
        return '<div class="chat-msg ' + cls + '">' + esc(m.text || "") + '</div>';
    }).join("");
    container.scrollTop = container.scrollHeight;
}

function sendChatMessage() {
    var input = $("chatInput");
    var text = input.value.trim();
    if (!text || !currentChatId) return;
    addDoc(collection(db, "messages"), {
        senderId: authUser.uid,
        receiverId: currentChatId,
        text: text,
        read: false,
        createdAt: serverTimestamp()
    }).then(function() {
        input.value = "";
        openChat(currentChatId);
    }).catch(function() {});
}

/* ============================================================
   MASTER RENDER
   ============================================================ */
function renderAll(){
    renderOrders();
    renderReservations();
    renderMenu();
    renderUsers();
    renderRiders();
    renderMessages();
    renderDashboard();
    renderNotifications();
}

/* expose needed globals for inline onclick handlers */
window.openOrderModal = openOrderModal;
window.openReservationModal = openReservationModal;
window.updateOrderStatus = updateOrderStatus;
window.acceptOrder = acceptOrder;
window.riderAdvance = riderAdvance;
window.setReservation = setReservation;
window.openMenuModal = openMenuModal;
window.editMenuItem = editMenuItem;
window.deleteMenuItem = deleteMenuItem;
window.openRiderModal = openRiderModal;
window.editRider = editRider;
window.deleteRider = deleteRider;
window.openMessageModal = openMessageModal;
window.openUserModal = openUserModal;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.showSection = showSection;
window.markNotificationRead = markNotificationRead;
