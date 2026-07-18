import {
    app, auth, db,
    ADMIN_EMAIL, ADMIN_NAME, isAdmin,
    ORDER_STATUS, ORDER_STATUS_ALT, ALL_STATUSES,
    canTransition, normalizeStatus, deliveryStatusFor,
    collection, doc, setDoc, addDoc, updateDoc, deleteDoc,
    getDocs, getDoc, query, orderBy, serverTimestamp, onSnapshot,
    notify, logActivity, saveOrder, updateOrder, pushStatusHistory
} from './js/firebase-shared.js';

var currentUser = null;
var riderDoc = null;
var availableUnsubscribe = null;
var myOrdersUnsubscribe = null;
var menuUnsubscribe = null;
var ridersUnsubscribe = null;

/* ============================================================
   AUTH CHECK
   ============================================================ */
onAuthStateChanged(auth, function(user) {
    if (!user) {
        window.location.href = '../sarab/index.html';
        return;
    }
    currentUser = user;

    /* Check if rider */
    getDocs(collection(db, 'riders')).then(function(snap) {
        var isRider = false;
        snap.docs.forEach(function(d) {
            if (d.data().uid === user.uid) {
                isRider = true;
                riderDoc = d.data();
                riderDoc.id = d.id;
            }
        });

        if (!isRider) {
            window.location.href = '../sarab/index.html';
            return;
        }

        initRider();
        connectRiderSync(user);
    }).catch(function() {
        window.location.href = '../sarab/index.html';
    });
});

/* Connect the rider to the real-time sync server for instant
   assignment notifications and live GPS tracking. */
function connectRiderSync(user) {
    if (typeof RTSync === "undefined") return;
    window.RTSync.connect({ uid: user.uid, email: user.email, role: "rider" });
    RTSync.on("notification", function(n) {
        if (!n) return;
        showToast((n.title || "Notification") + (n.body ? ": " + n.body : ""), "info");
    });
    RTSync.on("order:assigned", function(o) {
        if (o && o.riderUid === user.uid) {
            showToast("New order assigned: #" + (o.id || ""), "success");
            loadAvailableOrders();
            loadMyDeliveries();
        }
    });
    RTSync.on("order:status", function(p) {
        if (p) { loadMyDeliveries(); loadAvailableOrders(); }
    });
    startLiveLocation();
}

function initRider() {
    setupNavigation();
    setupModals();
    setupStatusToggle();
    setupProfile();
    setupFilters();
    loadDashboard();
    loadAvailableOrders();
    loadMyDeliveries();
    loadMenu();
    loadRiders();
}

/* ============================================================
   NAVIGATION
   ============================================================ */
function setupNavigation() {
    document.querySelectorAll('.rider-nav-item[data-section]').forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            var section = this.getAttribute('data-section');
            showSection(section);
            document.querySelectorAll('.rider-nav-item').forEach(function(n) { n.classList.remove('active'); });
            this.classList.add('active');
        });
    });

    document.getElementById('riderToggle').addEventListener('click', function() {
        document.getElementById('riderSidebar').classList.toggle('show');
    });

    document.getElementById('riderLogout').addEventListener('click', function() {
        if (availableUnsubscribe) availableUnsubscribe();
        if (myOrdersUnsubscribe) myOrdersUnsubscribe();
        if (menuUnsubscribe) menuUnsubscribe();
        if (ridersUnsubscribe) ridersUnsubscribe();
        auth.signOut();
        window.location.href = '../sarab/index.html';
    });
}

function showSection(sectionId) {
    document.querySelectorAll('.rider-section').forEach(function(s) { s.classList.remove('active'); });
    document.getElementById('section-' + sectionId).classList.add('active');
    if (sectionId === 'dashboard') loadDashboard();
    if (sectionId === 'available') loadAvailableOrders();
    if (sectionId === 'myorders') loadMyDeliveries();
    if (sectionId === 'menu') loadMenu();
    if (sectionId === 'riders') loadRiders();
    if (sectionId === 'profile') setupProfile();
}

/* ============================================================
   MODALS
   ============================================================ */
function setupModals() {
    document.getElementById('orderModalClose').addEventListener('click', closeOrderModal);
    document.getElementById('orderModalCvr').addEventListener('click', closeOrderModal);
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('open');
    document.getElementById('orderModalCvr').classList.remove('show');
}

function viewOrder(orderId) {
    getDoc(doc(db, 'orders', orderId)).then(function(snap) {
        if (!snap.exists) {
            getDocs(collection(db, 'orders')).then(function(snapAll) {
                snapAll.docs.forEach(function(d) {
                    if (d.data().id === orderId) {
                        renderOrderDetail(d.data(), d.id);
                    }
                });
            });
            return;
        }
        renderOrderDetail(snap.data(), snap.id);
    });
}

function renderOrderDetail(order, id) {
    var itemsHtml = '';
    if (order.items && Array.isArray(order.items)) {
        order.items.forEach(function(it) {
            itemsHtml += '<div class="order-item">' +
                '<strong>' + (it.title || it) + '</strong>' +
                '<span>x' + (it.qty || 1) + '</span>' +
                '<span>$' + ((it.price || 0) * (it.qty || 1)).toFixed(2) + '</span>' +
                '</div>';
        });
    } else if (order.itemLines) {
        itemsHtml = order.itemLines.map(function(line) { return '<div class="order-item">' + line + '</div>'; }).join('');
    }

    var statusColor = '#888';
    if (order.deliveryStatus === 'assigned') statusColor = '#3498db';
    else if (order.deliveryStatus === 'picked_up') statusColor = '#f39c12';
    else if (order.deliveryStatus === 'delivered') statusColor = '#27ae60';

    document.getElementById('orderModalBody').innerHTML =
        '<div class="order-detail-grid">' +
        '<div class="order-detail-item"><strong>Order ID:</strong> #' + (order.id || id) + '</div>' +
        '<div class="order-detail-item"><strong>Customer:</strong> ' + (order.customer || 'Guest') + '</div>' +
        '<div class="order-detail-item"><strong>Email:</strong> ' + (order.email || '-') + '</div>' +
        '<div class="order-detail-item"><strong>Phone:</strong> ' + (order.phone || '-') + '</div>' +
        '<div class="order-detail-item"><strong>Total:</strong> $' + (parseFloat(order.total) || 0).toFixed(2) + '</div>' +
        '<div class="order-detail-item"><strong>Delivery Status:</strong> <span style="color:' + statusColor + ';font-weight:600;">' + (order.deliveryStatus || 'Pending') + '</span></div>' +
        '<div class="order-detail-item"><strong>Payment:</strong> ' + (order.method || '-') + '</div>' +
        '<div class="order-detail-item"><strong>Date:</strong> ' + (order.date || '-') + '</div>' +
        '</div>' +
        '<h5 class="mt-4 mb-3">Items</h5>' +
        '<div class="order-items-list">' + itemsHtml + '</div>';

    document.getElementById('orderModal').classList.add('open');
    document.getElementById('orderModalCvr').classList.add('show');
}

/* ============================================================
   STATUS TOGGLE
   ============================================================ */
function setupStatusToggle() {
    var btn = document.getElementById('riderStatusBtn');
    var dot = document.getElementById('riderStatusDot');
    var text = document.getElementById('riderStatusText');

    if (riderDoc && riderDoc.available) {
        btn.classList.add('available');
        dot.style.background = '#fff';
        text.textContent = 'Available';
    }

    btn.addEventListener('click', function() {
        if (!riderDoc) return;
        var newStatus = !riderDoc.available;
        updateDoc(doc(db, 'riders', riderDoc.id), { available: newStatus }).then(function() {
            riderDoc.available = newStatus;
            if (newStatus) {
                btn.classList.add('available');
                text.textContent = 'Available';
                showToast('You are now available for deliveries', 'success');
            } else {
                btn.classList.remove('available');
                text.textContent = 'Offline';
                showToast('You are now offline', 'warn');
            }
        });
    });
}

/* ============================================================
   PROFILE
   ============================================================ */
function setupProfile() {
    if (!currentUser || !riderDoc) return;
    document.getElementById('riderName').textContent = riderDoc.name || currentUser.displayName || 'Rider';
    document.getElementById('riderProfileName').value = riderDoc.name || '';
    document.getElementById('riderProfileEmail').value = riderDoc.email || currentUser.email || '';
    document.getElementById('riderProfilePhone').value = riderDoc.phone || '';
    document.getElementById('riderVehicle').value = riderDoc.vehicle || 'Motorcycle';
    document.getElementById('riderLicense').value = riderDoc.license || '';

    document.getElementById('riderProfileForm').addEventListener('submit', function(e) {
        e.preventDefault();
        var data = {
            name: document.getElementById('riderProfileName').value,
            phone: document.getElementById('riderProfilePhone').value,
            vehicle: document.getElementById('riderVehicle').value,
            license: document.getElementById('riderLicense').value
        };
        updateDoc(doc(db, 'riders', riderDoc.id), data).then(function() {
            riderDoc = Object.assign({}, riderDoc, data);
            document.getElementById('riderName').textContent = data.name || 'Rider';
            showToast('Profile updated', 'success');
        });
    });
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function loadDashboard() {
    loadStats();
    loadRecentActivity();
}

function loadStats() {
    var availableCount = 0;
    var myCount = 0;
    var completedCount = 0;
    var earnings = 0;

    getDocs(collection(db, 'orders')).then(function(snap) {
        snap.docs.forEach(function(d) {
            var o = d.data();
            if (o.deliveryStatus === 'pending' || o.deliveryStatus === 'assigned') {
                if (o.riderId === currentUser.uid) myCount++;
                else if (!o.riderId) availableCount++;
            }
            if (o.deliveryStatus === 'delivered' && o.riderId === currentUser.uid) {
                completedCount++;
                earnings += (parseFloat(o.total) || 0) * 0.1;
            }
        });

        document.getElementById('statAvailable').textContent = availableCount;
        document.getElementById('statMyDeliveries').textContent = myCount;
        document.getElementById('statCompleted').textContent = completedCount;
        document.getElementById('statEarnings').textContent = '$' + earnings.toFixed(2);
    });
}

function loadRecentActivity() {
    getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'))).then(function(snap) {
        var tbody = document.getElementById('recentActivityTable');
        tbody.innerHTML = '';
        snap.docs.slice(0, 5).forEach(function(d) {
            var o = d.data();
            if (o.riderId !== currentUser.uid) return;
            tbody.innerHTML += '<tr>' +
                '<td><strong>#' + (o.id || d.id) + '</strong></td>' +
                '<td>' + (o.customer || 'Guest') + '</td>' +
                '<td>$' + (parseFloat(o.total) || 0).toFixed(2) + '</td>' +
                '<td>' + getDeliveryBadge(o.deliveryStatus) + '</td>' +
                '<td>' + (o.date ? new Date(o.date).toLocaleDateString() : '-') + '</td>' +
                '</tr>';
        });
        if (tbody.innerHTML === '') {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#bbb;padding:30px;">No activity yet</td></tr>';
        }
    });
}

/* ============================================================
   AVAILABLE ORDERS
   ============================================================ */
function loadAvailableOrders() {
    if (availableUnsubscribe) availableUnsubscribe();

    var q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    availableUnsubscribe = onSnapshot(q, function(snap) {
        renderAvailableOrders(snap.docs);
    }, function(err) {
        console.error('Available orders listener error:', err);
    });
}

function renderAvailableOrders(docs) {
    var tbody = document.getElementById('availableOrdersTable');
    tbody.innerHTML = '';
    var count = 0;

    docs.forEach(function(d) {
        var o = d.data();
        /* Show orders the rider can act on: unassigned+pending, or assigned to this rider. */
        var actionable = (o.deliveryStatus === 'pending' && !o.riderId) ||
                         (o.riderId === currentUser.uid && (o.deliveryStatus === 'assigned'));
        if (!actionable) return;
        count++;

        var address = (o.address || '') + ', ' + (o.city || '') + ' ' + (o.zip || '');
        var itemsStr = '';
        if (o.itemLines && Array.isArray(o.itemLines)) {
            itemsStr = o.itemLines.slice(0, 2).join(', ') + (o.itemLines.length > 2 ? ' +' + (o.itemLines.length - 2) : '');
        }

        var actionBtn;
        if (o.riderId === currentUser.uid) {
            actionBtn = '<button class="rider-btn rider-btn-success pickup-btn" data-id="' + d.id + '"><i class="fas fa-box me-1"></i>Picked Up</button>' +
                        '<button class="rider-btn rider-btn-danger decline-order-btn" data-id="' + d.id + '"><i class="fas fa-times me-1"></i>Decline</button>';
        } else {
            actionBtn = '<button class="rider-btn rider-btn-primary accept-order-btn" data-id="' + d.id + '"><i class="fas fa-check me-1"></i>Accept</button>';
        }
        tbody.innerHTML += '<tr>' +
            '<td><strong>#' + (o.id || d.id) + '</strong></td>' +
            '<td>' + (o.customer || 'Guest') + '<br/><small>' + (o.email || '') + '</small></td>' +
            '<td>' + address + '</td>' +
            '<td>' + itemsStr + '</td>' +
            '<td><strong>$' + (parseFloat(o.total) || 0).toFixed(2) + '</strong></td>' +
            '<td>' + (o.distance || '2.4 km') + '</td>' +
            '<td>' + actionBtn + '</td>' +
            '</tr>';
    });

    document.getElementById('availableBadge').style.display = count > 0 ? 'inline' : 'none';
    document.getElementById('availableBadge').textContent = count;

    document.querySelectorAll('.accept-order-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var orderId = this.getAttribute('data-id');
            acceptOrder(orderId);
        });
    });
    document.querySelectorAll('.decline-order-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var orderId = this.getAttribute('data-id');
            declineOrder(orderId);
        });
    });
    document.querySelectorAll('.pickup-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var orderId = this.getAttribute('data-id');
            updateOrderStatus(orderId, 'picked_up');
        });
    });
}

/* Mirror an order change to the customer's subcollection (real-time sync). */
function notifyUser(uid, orderId, title, body) {
    if (!uid) return;
    addDoc(collection(db, 'users', uid, 'notifications'), {
        type: 'order', title: title, body: body, orderId: orderId, createdAt: serverTimestamp(), read: false
    }).catch(function() {});
}

function acceptOrder(orderId) {
    if (!riderDoc || !riderDoc.available) {
        showToast('You must be available to accept orders', 'err');
        return;
    }

    var orderRef = doc(db, 'orders', orderId);
    getDoc(orderRef).then(function(snap) {
        if (!snap.exists()) return;
        var order = snap.data();
        if (order.riderId) {
            showToast('This order has already been assigned', 'err');
            return;
        }

        return updateDoc(orderRef, {
            riderId: currentUser.uid,
            riderName: riderDoc.name || currentUser.displayName || 'Rider',
            riderPhone: riderDoc.phone || '',
            riderVehicle: riderDoc.vehicle || '',
            status: 'Rider Accepted',
            deliveryStatus: 'assigned',
            assignedAt: serverTimestamp()
        }).then(function() {
            /* Push through the real-time sync server so every dashboard
               (customer + admin) updates instantly, no refresh. */
            if (window.RTSync) window.RTSync.setStatus(orderId, 'Rider Accepted');
            /* Notify the customer that the rider accepted the order. */
            notifyUser(order.uid, orderId, 'Rider Accepted your order', riderDoc.name + ' has accepted order #' + orderId + ' and is preparing to pick it up.');
            /* Notify admins via the global notifications collection. */
            addDoc(collection(db, 'notifications'), {
                type: 'order', title: 'Rider accepted #' + orderId, body: riderDoc.name + ' accepted the order.', orderId: orderId, createdAt: serverTimestamp(), read: false
            }).catch(function() {});
            logActivity({ type: "order_accepted", orderId: orderId, actor: currentUser.uid, detail: riderDoc.name });
            showToast('Order accepted! Check My Deliveries.', 'success');
        });
    }).catch(function(err) {
        showToast('Failed to accept order: ' + err.message, 'err');
    });
}

/* Rider declines an assigned order -> returns it to the admin queue. */
function declineOrder(orderId) {
    updateDoc(doc(db, 'orders', orderId), {
        riderId: null,
        riderName: null,
        status: 'Returned',
        deliveryStatus: 'pending'
    }).then(function() {
        /* Real-time: immediately return the order to the admin queue and
           notify the admin that a reassignment is needed. */
        if (window.RTSync) window.RTSync.declineRider(orderId);
        addDoc(collection(db, 'notifications'), {
            type: 'order', title: 'Order returned #' + orderId, body: (riderDoc ? riderDoc.name : 'Rider') + ' declined the order. Reassign needed.', orderId: orderId, createdAt: serverTimestamp(), read: false
        }).catch(function() {});
        logActivity({ type: "order_declined", orderId: orderId, actor: currentUser.uid, detail: riderDoc ? riderDoc.name : "rider" });
        showToast('Order returned to admin queue', 'warn');
        loadAvailableOrders();
    }).catch(function(err) {
        showToast('Failed to decline: ' + err.message, 'err');
    });
}

/* Push the rider's live GPS location to the sync server so the
   customer + admin tracking maps update in real time. */
function startLiveLocation() {
    if (!navigator.geolocation) return;
    if (window.RTSync) {
        navigator.geolocation.watchPosition(function(pos) {
            window.RTSync.sendLocation(pos.coords.latitude, pos.coords.longitude);
            if (riderDoc) {
                updateDoc(doc(db, 'riders', riderDoc.id), {
                    lat: pos.coords.latitude, lng: pos.coords.longitude, lastSeen: serverTimestamp()
                }).catch(function() {});
            }
        }, function() {}, { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 });
    }
}

/* ============================================================
   MY DELIVERIES
   ============================================================ */
function loadMyDeliveries() {
    if (myOrdersUnsubscribe) myOrdersUnsubscribe();

    var q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    myOrdersUnsubscribe = onSnapshot(q, function(snap) {
        renderMyDeliveries(snap.docs);
    }, function(err) {
        console.error('My deliveries listener error:', err);
    });
}

function renderMyDeliveries(docs) {
    var tbody = document.getElementById('myDeliveriesTable');
    tbody.innerHTML = '';
    var filter = document.getElementById('deliveryStatusFilter').value;

    docs.forEach(function(d) {
        var o = d.data();
        if (o.riderId !== currentUser.uid) return;
        if (filter !== 'all' && o.deliveryStatus !== filter) return;

        var address = (o.address || '') + ', ' + (o.city || '') + ' ' + (o.zip || '');
        var itemsStr = '';
        if (o.itemLines && Array.isArray(o.itemLines)) {
            itemsStr = o.itemLines.slice(0, 2).join(', ') + (o.itemLines.length > 2 ? ' +' + (o.itemLines.length - 2) : '');
        }

        var actions = '';
        if (o.deliveryStatus === 'assigned') {
            actions = '<button class="rider-btn rider-btn-success pickup-btn" data-id="' + d.id + '"><i class="fas fa-box me-1"></i>Picked Up</button>';
        } else if (o.deliveryStatus === 'picked_up') {
            actions = '<button class="rider-btn rider-btn-success deliver-btn" data-id="' + d.id + '"><i class="fas fa-check me-1"></i>Delivered</button>';
        } else {
            actions = '<button class="rider-btn rider-btn-outline view-btn" data-id="' + d.id + '"><i class="fas fa-eye"></i></button>';
        }

        tbody.innerHTML += '<tr>' +
            '<td><strong>#' + (o.id || d.id) + '</strong></td>' +
            '<td>' + (o.customer || 'Guest') + '<br/><small>' + (o.email || '') + '</small></td>' +
            '<td>' + address + '</td>' +
            '<td>' + itemsStr + '</td>' +
            '<td><strong>$' + (parseFloat(o.total) || 0).toFixed(2) + '</strong></td>' +
            '<td>' + getDeliveryBadge(o.deliveryStatus) + '</td>' +
            '<td><div class="d-flex gap-1">' + actions + '</div></td>' +
            '</tr>';
    });

    document.querySelectorAll('.pickup-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var orderId = this.getAttribute('data-id');
            updateOrderStatus(orderId, 'picked_up');
        });
    });

    document.querySelectorAll('.deliver-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var orderId = this.getAttribute('data-id');
            updateOrderStatus(orderId, 'delivered');
        });
    });

    document.querySelectorAll('.view-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var orderId = this.getAttribute('data-id');
            viewOrder(orderId);
        });
    });
}

function updateOrderStatus(orderId, status) {
    var nextStatus = status === 'picked_up' ? 'Picked Up' : (status === 'delivered' ? 'Delivered' : normalizeStatus(status));
    var changes = { deliveryStatus: status, status: nextStatus };
    if (status === 'delivered') changes.completedAt = serverTimestamp();
    updateDoc(doc(db, 'orders', orderId), changes).then(function() {
        if (status === 'picked_up') {
            getDoc(doc(db, 'orders', orderId)).then(function(snap) {
                if (snap.exists()) notifyUser(snap.data().uid, orderId, 'Out for delivery', 'Your order #' + orderId + ' is on the way!');
            });
        }
        if (status === 'delivered') {
            getDoc(doc(db, 'orders', orderId)).then(function(snap) {
                if (snap.exists()) notifyUser(snap.data().uid, orderId, 'Order Delivered', 'Your order #' + orderId + ' has been delivered. Thank you!');
            });
        }
        showToast('Order #' + orderId + ' updated to ' + nextStatus, 'success');
    }).catch(function(err) {
        showToast('Failed to update order: ' + err.message, 'err');
    });
}

function setupFilters() {
    var filter = document.getElementById('deliveryStatusFilter');
    if (filter) {
        filter.addEventListener('change', function() {
            loadMyDeliveries();
        });
    }
}

/* ============================================================
   MODALS
   ============================================================ */
function loadMenu() {
    if (menuUnsubscribe) menuUnsubscribe();

    var q = query(collection(db, 'menu'), orderBy('name', 'asc'));
    menuUnsubscribe = onSnapshot(q, function(snap) {
        renderMenu(snap.docs);
    }, function(err) {
        console.error('Menu listener error:', err);
    });
}

function renderMenu(docs) {
    var tbody = document.getElementById('menuTable');
    tbody.innerHTML = '';
    docs.forEach(function(d) {
        var m = d.data();
        tbody.innerHTML += '<tr>' +
            '<td><img src="' + (m.img || 'img/menu/1.jpg') + '" style="width:50px;height:50px;object-fit:cover;border-radius:8px;"/></td>' +
            '<td><strong>' + (m.name || m.title || '') + '</strong></td>' +
            '<td>' + (m.category || '-') + '</td>' +
            '<td>$' + (parseFloat(m.price) || 0).toFixed(2) + '</td>' +
            '<td>' + (m.rating || '0') + '/5</td>' +
            '<td>' + (m.tags || '').split(',').filter(Boolean).map(function(t) { return '<span class="mptag">' + t.trim() + '</span>'; }).join(' ') + '</td>' +
            '</tr>';
    });
}

/* ============================================================
   RIDERS
   ============================================================ */
function loadRiders() {
    if (ridersUnsubscribe) ridersUnsubscribe();

    var q = query(collection(db, 'riders'), orderBy('name', 'asc'));
    ridersUnsubscribe = onSnapshot(q, function(snap) {
        renderRiders(snap.docs);
    }, function(err) {
        console.error('Riders listener error:', err);
    });
}

function renderRiders(docs) {
    var tbody = document.getElementById('ridersTable');
    tbody.innerHTML = '';
    docs.forEach(function(d) {
        var r = d.data();
        var statusColor = r.available ? '#27ae60' : '#e74c3c';
        var statusText = r.available ? 'Available' : 'Offline';
        var currentOrder = r.currentOrderId ? '#' + r.currentOrderId : '-';

        tbody.innerHTML += '<tr>' +
            '<td><strong>' + (r.name || '') + '</strong></td>' +
            '<td>' + (r.email || '') + '</td>' +
            '<td>' + (r.phone || '-') + '</td>' +
            '<td>' + (r.vehicle || '-') + ' ' + (r.license || '') + '</td>' +
            '<td><span style="background:' + statusColor + ';color:#fff;padding:4px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">' + statusText + '</span></td>' +
            '<td>' + currentOrder + '</td>' +
            '</tr>';
    });
}

/* ============================================================
   UTILITIES
   ============================================================ */
function getDeliveryBadge(status) {
    var color = '#888';
    if (status === 'assigned') color = '#3498db';
    else if (status === 'picked_up') color = '#f39c12';
    else if (status === 'delivered') color = '#27ae60';
    else if (status === 'pending') color = '#e74c3c';
    return '<span style="background:' + color + ';color:#fff;padding:4px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">' + (status || 'Pending') + '</span>';
}

function showToast(message, type) {
    type = type || 'success';
    var container = document.getElementById('toastContainer') || document.body;
    var old = container.querySelector('.rider-toast');
    if (old) old.remove();

    var toast = document.createElement('div');
    toast.className = 'rider-toast ' + type;
    toast.innerHTML = '<i class="fas ' + (type === 'success' ? 'fa-check-circle' : 'fa-times-circle') + '"></i>' + message;
    container.appendChild(toast);

    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 3000);
}
