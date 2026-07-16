import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDoc,
    query,
    orderBy,
    serverTimestamp,
    onSnapshot,
    where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDb7Sys_Mh_BLOr1YfB6Kug_9K6_IuLoqg",
    authDomain: "fire-c1a91.firebaseapp.com",
    projectId: "fire-c1a91",
    storageBucket: "fire-c1a91.firebasestorage.app",
    messagingSenderId: "757687516476",
    appId: "1:757687516476:web:e41f779542e841d0ab3239"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

var currentUser = null;
var riderDoc = null;
var availableUnsubscribe = null;
var myOrdersUnsubscribe = null;

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
    }).catch(function() {
        window.location.href = '../sarab/index.html';
    });
});

function initRider() {
    setupNavigation();
    setupModals();
    setupStatusToggle();
    setupProfile();
    loadDashboard();
    loadAvailableOrders();
    loadMyDeliveries();
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
    getDocs(collection(db, 'orders')).then(function(snap) {
        var order = null;
        snap.docs.forEach(function(d) {
            if (d.id === orderId || (d.data().id === orderId)) {
                order = d.data();
                order.id = d.id;
            }
        });
        if (!order) return;

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
            '<div class="order-detail-item"><strong>Order ID:</strong> #' + order.id + '</div>' +
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
    });
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
        if (o.deliveryStatus !== 'pending' || o.riderId) return;
        count++;

        var address = (o.address || '') + ', ' + (o.city || '') + ' ' + (o.zip || '');
        var itemsStr = '';
        if (o.itemLines && Array.isArray(o.itemLines)) {
            itemsStr = o.itemLines.slice(0, 2).join(', ') + (o.itemLines.length > 2 ? ' +' + (o.itemLines.length - 2) : '');
        }

        tbody.innerHTML += '<tr>' +
            '<td><strong>#' + (o.id || d.id) + '</strong></td>' +
            '<td>' + (o.customer || 'Guest') + '<br/><small>' + (o.email || '') + '</small></td>' +
            '<td>' + address + '</td>' +
            '<td>' + itemsStr + '</td>' +
            '<td><strong>$' + (parseFloat(o.total) || 0).toFixed(2) + '</strong></td>' +
            '<td>' + (o.distance || '2.4 km') + '</td>' +
            '<td><button class="rider-btn rider-btn-primary accept-order-btn" data-id="' + d.id + '"><i class="fas fa-check me-1"></i>Accept</button></td>' +
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
            deliveryStatus: 'assigned',
            assignedAt: serverTimestamp()
        });
    }).then(function() {
        showToast('Order accepted! Check My Deliveries.', 'success');
    }).catch(function(err) {
        showToast('Failed to accept order: ' + err.message, 'err');
    });
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
    var orderRef = doc(db, 'orders', orderId);
    updateDoc(orderRef, { deliveryStatus: status }).then(function() {
        showToast('Order #' + orderId + ' updated to ' + status, 'success');
    }).catch(function(err) {
        showToast('Failed to update order: ' + err.message, 'err');
    });
}

document.getElementById('deliveryStatusFilter').addEventListener('change', function() {
    loadMyDeliveries();
});

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
    document.body.appendChild(toast);

    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 3000);
}
