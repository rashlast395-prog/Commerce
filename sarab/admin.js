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
    deleteDoc,
    getDocs,
    getDoc,
    query,
    orderBy,
    serverTimestamp,
    updateDoc,
    onSnapshot
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

const ADMIN_EMAIL = 'rashlast395@gmail.com';

var currentUser = null;
var ordersUnsubscribe = null;
var reservationsUnsubscribe = null;
var menuUnsubscribe = null;
var customersUnsubscribe = null;
var ridersUnsubscribe = null;

/* ============================================================
   AUTH CHECK
   ============================================================ */
onAuthStateChanged(auth, function(user) {
    if (!user || (user.email !== ADMIN_EMAIL && user.displayName !== 'rashlast395-prog')) {
        window.location.href = '../sarab/index.html';
        return;
    }
    currentUser = user;
    initAdmin();
});

function initAdmin() {
    setupNavigation();
    setupModals();
    loadDashboard();
    loadOrders();
    loadReservations();
    loadMenu();
    loadCustomers();
    loadRiders();
}

/* ============================================================
   NAVIGATION
   ============================================================ */
function setupNavigation() {
    document.querySelectorAll('.admin-nav-item[data-section]').forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            var section = this.getAttribute('data-section');
            showSection(section);
            document.querySelectorAll('.admin-nav-item').forEach(function(n) { n.classList.remove('active'); });
            this.classList.add('active');
        });
    });

    document.getElementById('adminToggle').addEventListener('click', function() {
        document.getElementById('adminSidebar').classList.toggle('show');
    });

    document.getElementById('adminLogout').addEventListener('click', function() {
        if (ordersUnsubscribe) ordersUnsubscribe();
        if (reservationsUnsubscribe) reservationsUnsubscribe();
        if (menuUnsubscribe) menuUnsubscribe();
        if (customersUnsubscribe) customersUnsubscribe();
        auth.signOut();
        window.location.href = '../sarab/index.html';
    });
}

function showSection(sectionId) {
    document.querySelectorAll('.admin-section').forEach(function(s) { s.classList.remove('active'); });
    document.getElementById('section-' + sectionId).classList.add('active');
    if (sectionId === 'dashboard') loadDashboard();
    if (sectionId === 'orders') loadOrders();
    if (sectionId === 'reservations') loadReservations();
    if (sectionId === 'menu') loadMenu();
    if (sectionId === 'customers') loadCustomers();
    if (sectionId === 'riders') loadRiders();
}

/* ============================================================
   MODALS
   ============================================================ */
function setupModals() {
    document.getElementById('orderModalClose').addEventListener('click', closeOrderModal);
    document.getElementById('orderModalCvr').addEventListener('click', closeOrderModal);
    document.getElementById('menuModalClose').addEventListener('click', closeMenuModal);
    document.getElementById('menuModalCvr').addEventListener('click', closeMenuModal);
    document.getElementById('addMenuItemBtn').addEventListener('click', openMenuModal);
    document.getElementById('menuItemForm').addEventListener('submit', saveMenuItem);
    document.getElementById('riderModalClose').addEventListener('click', closeRiderModal);
    document.getElementById('riderModalCvr').addEventListener('click', closeRiderModal);
    document.getElementById('addRiderBtn').addEventListener('click', function() { openRiderModal(null); });
    document.getElementById('riderForm').addEventListener('submit', saveRider);
    document.getElementById('orderStatusFilter').addEventListener('change', applyOrderFilter);
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('open');
    document.getElementById('orderModalCvr').classList.remove('show');
}

function closeMenuModal() {
    document.getElementById('menuModal').classList.remove('open');
    document.getElementById('menuModalCvr').classList.remove('show');
}

function openMenuModal(item) {
    document.getElementById('menuModalTitle').textContent = item ? 'Edit Menu Item' : 'Add Menu Item';
    document.getElementById('menuItemId').value = item ? item.id : '';
    document.getElementById('menuItemName').value = item ? item.name : '';
    document.getElementById('menuItemCategory').value = item ? item.category : 'Burgers';
    document.getElementById('menuItemPrice').value = item ? item.price : '';
    document.getElementById('menuItemImage').value = item ? item.image : '';
    document.getElementById('menuItemDesc').value = item ? item.desc : '';
    document.getElementById('menuModal').classList.add('open');
    document.getElementById('menuModalCvr').classList.add('show');
}

function closeRiderModal() {
    document.getElementById('riderModal').classList.remove('open');
    document.getElementById('riderModalCvr').classList.remove('show');
}

function openRiderModal(rider) {
    document.getElementById('riderModalTitle').textContent = rider ? 'Edit Rider' : 'Add Rider';
    document.getElementById('riderId').value = rider ? rider.id : '';
    document.getElementById('riderName').value = rider ? rider.name : '';
    document.getElementById('riderEmail').value = rider ? rider.email : '';
    document.getElementById('riderPhone').value = rider ? rider.phone : '';
    document.getElementById('riderVehicle').value = rider ? rider.vehicle : 'Motorcycle';
    document.getElementById('riderLicense').value = rider ? rider.license : '';
    document.getElementById('riderModal').classList.add('open');
    document.getElementById('riderModalCvr').classList.add('show');
}

function saveRider(e) {
    e.preventDefault();
    var id = document.getElementById('riderId').value;
    var data = {
        name: document.getElementById('riderName').value,
        email: document.getElementById('riderEmail').value,
        phone: document.getElementById('riderPhone').value,
        vehicle: document.getElementById('riderVehicle').value,
        license: document.getElementById('riderLicense').value,
        available: false
    };

    if (id) {
        updateDoc(doc(db, 'riders', id), data).then(function() {
            showToast('Rider updated', 'success');
            closeRiderModal();
            loadRiders();
        });
    } else {
        addDoc(collection(db, 'riders'), data).then(function() {
            showToast('Rider added', 'success');
            closeRiderModal();
            loadRiders();
        });
    }
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function loadDashboard() {
    loadStats();
    loadRecentOrders();
    loadRecentReservations();
}

function loadStats() {
    var ordersCol = collection(db, 'orders');
    getDocs(ordersCol).then(function(snap) {
        var orders = snap.docs.map(function(d) { return d.data(); });
        var total = orders.length;
        var pending = orders.filter(function(o) { return o.status === 'Order Received' || o.status === 'Preparing'; }).length;
        var delivery = orders.filter(function(o) { return o.status === 'Out for Delivery'; }).length;
        var revenue = orders.reduce(function(sum, o) { return sum + (parseFloat(o.total) || 0); }, 0);

        document.getElementById('statOrders').textContent = total;
        document.getElementById('statPending').textContent = pending;
        document.getElementById('statDelivery').textContent = delivery;
        document.getElementById('statRevenue').textContent = '$' + revenue.toFixed(2);
    });

    getDocs(collection(db, 'reservations')).then(function(snap) {
        document.getElementById('statReservations').textContent = snap.size;
    });

    getDocs(collection(db, 'users')).then(function(snap) {
        document.getElementById('statCustomers').textContent = snap.size;
    });
}

function loadRecentOrders() {
    var q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    getDocs(q).then(function(snap) {
        var tbody = document.getElementById('recentOrdersTable');
        tbody.innerHTML = '';
        snap.docs.slice(0, 5).forEach(function(d) {
            var o = d.data();
            tbody.innerHTML += '<tr>' +
                '<td><strong>#' + (o.id || d.id) + '</strong></td>' +
                '<td>' + (o.customer || 'Guest') + '</td>' +
                '<td>$' + (parseFloat(o.total) || 0).toFixed(2) + '</td>' +
                '<td>' + getStatusBadge(o.status) + '</td>' +
                '</tr>';
        });
    });
}

function loadRecentReservations() {
    var q = query(collection(db, 'reservations'), orderBy('createdAt', 'desc'));
    getDocs(q).then(function(snap) {
        var tbody = document.getElementById('recentReservationsTable');
        tbody.innerHTML = '';
        snap.docs.slice(0, 5).forEach(function(d) {
            var r = d.data();
            tbody.innerHTML += '<tr>' +
                '<td>' + (r.name || '') + '</td>' +
                '<td>' + (r.date || '') + '</td>' +
                '<td>' + (r.time || '') + '</td>' +
                '<td>' + (r.guests || '') + '</td>' +
                '</tr>';
        });
    });
}

/* ============================================================
   ORDER FILTER & BADGE
   ============================================================ */
function applyOrderFilter() {
    var filterVal = document.getElementById('orderStatusFilter').value;
    var rows = document.querySelectorAll('#allOrdersTable tbody tr');
    rows.forEach(function(row) {
        var statusCell = row.querySelector('td:nth-child(6)');
        if (!statusCell) return;
        var select = statusCell.querySelector('.admin-status-select');
        if (!select) return;
        var rowStatus = select.value;
        if (filterVal === 'all' || rowStatus === filterVal) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function updateOrdersBadge() {
    var rows = document.querySelectorAll('#allOrdersTable tbody tr');
    var count = 0;
    rows.forEach(function(row) {
        if (row.style.display === 'none') return;
        var select = row.querySelector('.admin-status-select');
        if (select && (select.value === 'Order Received' || select.value === 'Preparing')) {
            count++;
        }
    });
    var badge = document.getElementById('ordersBadge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

/* ============================================================
   ORDERS
   ============================================================ */
function loadOrders() {
    if (ordersUnsubscribe) ordersUnsubscribe();

    var q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    ordersUnsubscribe = onSnapshot(q, function(snap) {
        renderOrders(snap.docs);
    }, function(err) {
        console.error('Orders listener error:', err);
    });
}

function renderOrders(docs) {
    var tbody = document.getElementById('allOrdersTable');
    tbody.innerHTML = '';
    docs.forEach(function(d) {
        var o = d.data();
        var statuses = ['Order Received', 'Preparing', 'Out for Delivery', 'Delivered'];
        var statusOptions = statuses.map(function(s) {
            return '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + s + '</option>';
        }).join('');

        var deliveryStatuses = ['pending', 'assigned', 'picked_up', 'delivered'];
        var deliveryOptions = deliveryStatuses.map(function(s) {
            return '<option value="' + s + '"' + (o.deliveryStatus === s ? ' selected' : '') + '>' + s + '</option>';
        }).join('');

        var itemsStr = '';
        if (o.itemLines && Array.isArray(o.itemLines)) {
            itemsStr = o.itemLines.slice(0, 2).join(', ') + (o.itemLines.length > 2 ? ' +' + (o.itemLines.length - 2) : '');
        } else if (o.items && Array.isArray(o.items)) {
            itemsStr = o.items.map(function(i) { return i.title || i; }).slice(0, 2).join(', ');
        }

        var riderInfo = o.riderName ? o.riderName : 'Unassigned';

        tbody.innerHTML += '<tr>' +
            '<td><strong>#' + (o.id || d.id) + '</strong></td>' +
            '<td>' + (o.customer || 'Guest') + '<br/><small>' + (o.email || '') + '</small></td>' +
            '<td>' + itemsStr + '</td>' +
            '<td><strong>$' + (parseFloat(o.total) || 0).toFixed(2) + '</strong></td>' +
            '<td>' + (o.method || '') + '</td>' +
            '<td><select class="admin-status-select" data-id="' + d.id + '">' + statusOptions + '</select></td>' +
            '<td>' + riderInfo + '</td>' +
            '<td><select class="admin-delivery-select" data-id="' + d.id + '">' + deliveryOptions + '</select></td>' +
            '<td>' + (o.date ? new Date(o.date).toLocaleDateString() : '') + '</td>' +
            '<td><button class="admin-btn admin-btn-sm admin-btn-outline view-order-btn" data-id="' + d.id + '"><i class="fas fa-eye"></i></button></td>' +
            '</tr>';
    });

    document.querySelectorAll('.admin-status-select').forEach(function(sel) {
        sel.addEventListener('change', function() {
            var orderId = this.getAttribute('data-id');
            updateOrderStatus(orderId, this.value);
        });
    });

    document.querySelectorAll('.admin-delivery-select').forEach(function(sel) {
        sel.addEventListener('change', function() {
            var orderId = this.getAttribute('data-id');
            updateDeliveryStatus(orderId, this.value);
        });
    });

    document.querySelectorAll('.view-order-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var orderId = this.getAttribute('data-id');
            viewOrder(orderId);
        });
    });
    updateOrdersBadge();
    applyOrderFilter();
}

function updateDeliveryStatus(orderId, status) {
    var orderRef = doc(db, 'orders', orderId);
    updateDoc(orderRef, { deliveryStatus: status }).then(function() {
        showToast('Delivery status updated to ' + status, 'success');
    }).catch(function(err) {
        showToast('Failed to update delivery status: ' + err.message, 'err');
    });
}

function updateOrderStatus(orderId, status) {
    var orderRef = doc(db, 'orders', orderId);
    updateDoc(orderRef, { status: status }).then(function() {
        showToast('Order #' + orderId + ' updated to ' + status, 'success');
    }).catch(function(err) {
        showToast('Failed to update order: ' + err.message, 'err');
    });
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

    document.getElementById('orderModalBody').innerHTML =
        '<div class="order-detail-grid">' +
        '<div class="order-detail-item"><strong>Order ID:</strong> #' + (order.id || id) + '</div>' +
        '<div class="order-detail-item"><strong>Customer:</strong> ' + (order.customer || 'Guest') + '</div>' +
        '<div class="order-detail-item"><strong>Email:</strong> ' + (order.email || '-') + '</div>' +
        '<div class="order-detail-item"><strong>Phone:</strong> ' + (order.phone || '-') + '</div>' +
        '<div class="order-detail-item"><strong>Total:</strong> $' + (parseFloat(order.total) || 0).toFixed(2) + '</div>' +
        '<div class="order-detail-item"><strong>Status:</strong> ' + getStatusBadge(order.status) + '</div>' +
        '<div class="order-detail-item"><strong>Delivery Status:</strong> ' + getDeliveryBadge(order.deliveryStatus) + '</div>' +
        '<div class="order-detail-item"><strong>Rider:</strong> ' + (order.riderName || 'Unassigned') + '</div>' +
        '<div class="order-detail-item"><strong>Payment:</strong> ' + (order.method || '-') + '</div>' +
        '<div class="order-detail-item"><strong>Date:</strong> ' + (order.date || '-') + '</div>' +
        '</div>' +
        '<h5 class="mt-4 mb-3">Items</h5>' +
        '<div class="order-items-list">' + itemsHtml + '</div>';

    document.getElementById('orderModal').classList.add('open');
    document.getElementById('orderModalCvr').classList.add('show');
}

function updateDeliveryStatus(orderId, status) {() {
    if (reservationsUnsubscribe) reservationsUnsubscribe();

    var q = query(collection(db, 'reservations'), orderBy('createdAt', 'desc'));
    reservationsUnsubscribe = onSnapshot(q, function(snap) {
        renderReservations(snap.docs);
    }, function(err) {
        console.error('Reservations listener error:', err);
    });
}

function renderReservations(docs) {
    var tbody = document.getElementById('allReservationsTable');
    tbody.innerHTML = '';
    docs.forEach(function(d) {
        var r = d.data();
        tbody.innerHTML += '<tr>' +
            '<td><strong>' + (r.name || '') + '</strong></td>' +
            '<td>' + (r.email || '') + '</td>' +
            '<td>' + (r.phone || '') + '</td>' +
            '<td>' + (r.guests || '') + '</td>' +
            '<td>' + (r.date || '') + '</td>' +
            '<td>' + (r.time || '') + '</td>' +
            '<td>' + (r.notes || '-') + '</td>' +
            '<td>' + (r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleString() : '-') + '</td>' +
            '</tr>';
    });
}

/* ============================================================
   MENU MANAGEMENT
   ============================================================ */
function loadMenu() {
    if (menuUnsubscribe) menuUnsubscribe();

    menuUnsubscribe = onSnapshot(collection(db, 'menu'), function(snap) {
        renderMenu(snap.docs);
    }, function(err) {
        console.error('Menu listener error:', err);
        renderMenu([]);
    });
}

function renderMenu(docs) {
    var tbody = document.getElementById('menuTable');
    tbody.innerHTML = '';
    docs.forEach(function(d) {
        var item = d.data();
        item.id = d.id;
        tbody.innerHTML += '<tr>' +
            '<td><img src="' + (item.image || 'img/menu/1.jpg') + '" style="width:50px;height:50px;border-radius:8px;object-fit:cover;"/></td>' +
            '<td><strong>' + (item.name || '') + '</strong></td>' +
            '<td>' + (item.category || '') + '</td>' +
            '<td>$' + (parseFloat(item.price) || 0).toFixed(2) + '</td>' +
            '<td>' + (item.rating || '-') + '</td>' +
            '<td>' +
            '<button class="admin-btn admin-btn-sm admin-btn-outline me-1 edit-menu-btn" data-id="' + d.id + '"><i class="fas fa-edit"></i></button>' +
            '<button class="admin-btn admin-btn-sm admin-btn-outline delete-menu-btn" data-id="' + d.id + '"><i class="fas fa-trash"></i></button>' +
            '</td>' +
            '</tr>';
    });

    document.querySelectorAll('.edit-menu-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var itemId = this.getAttribute('data-id');
            var item = docs.find(function(d) { return d.id === itemId; });
            if (item) openMenuModal(Object.assign({}, item.data(), { id: item.id }));
        });
    });

    document.querySelectorAll('.delete-menu-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var itemId = this.getAttribute('data-id');
            if (confirm('Delete this menu item?')) {
                deleteDoc(doc(db, 'menu', itemId)).then(function() {
                    showToast('Menu item deleted', 'success');
                });
            }
        });
    });
}

function saveMenuItem(e) {
    e.preventDefault();
    var id = document.getElementById('menuItemId').value;
    var data = {
        name: document.getElementById('menuItemName').value,
        category: document.getElementById('menuItemCategory').value,
        price: parseFloat(document.getElementById('menuItemPrice').value),
        image: document.getElementById('menuItemImage').value || 'img/menu/1.jpg',
        desc: document.getElementById('menuItemDesc').value,
        rating: '4.5',
        reviews: '0'
    };

    if (id) {
        updateDoc(doc(db, 'menu', id), data).then(function() {
            showToast('Menu item updated', 'success');
            closeMenuModal();
        });
    } else {
        addDoc(collection(db, 'menu'), data).then(function() {
            showToast('Menu item added', 'success');
            closeMenuModal();
        });
    }
}

/* ============================================================
   CUSTOMERS
   ============================================================ */
function loadCustomers() {
    if (customersUnsubscribe) customersUnsubscribe();

    customersUnsubscribe = onSnapshot(collection(db, 'users'), function(snap) {
        renderCustomers(snap.docs);
    }, function(err) {
        console.error('Customers listener error:', err);
    });
}

function renderCustomers(docs) {
    var tbody = document.getElementById('customersTable');
    tbody.innerHTML = '';
    docs.forEach(function(d) {
        var u = d.data();
        tbody.innerHTML += '<tr>' +
            '<td><strong>' + (u.name || '') + '</strong></td>' +
            '<td>' + (u.email || '') + '</td>' +
            '<td>' + (u.phone || '-') + '</td>' +
            '<td>' + (u.createdAt ? new Date(u.createdAt.seconds * 1000).toLocaleDateString() : '-') + '</td>' +
            '</tr>';
    });
}

/* ============================================================
   RIDERS
   ============================================================ */
function loadRiders() {
    if (ridersUnsubscribe) ridersUnsubscribe();

    ridersUnsubscribe = onSnapshot(collection(db, 'riders'), function(snap) {
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
            '<td>' + (r.vehicle || '-') + '<br/><small>' + (r.license || '-') + '</small></td>' +
            '<td><span style="background:' + statusColor + ';color:#fff;padding:4px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">' + statusText + '</span></td>' +
            '<td>' + currentOrder + '</td>' +
            '<td>' +
            '<button class="admin-btn admin-btn-sm admin-btn-outline me-1 edit-rider-btn" data-id="' + d.id + '"><i class="fas fa-edit"></i></button>' +
            '<button class="admin-btn admin-btn-sm admin-btn-outline delete-rider-btn" data-id="' + d.id + '"><i class="fas fa-trash"></i></button>' +
            '</td>' +
            '</tr>';
    });

    document.querySelectorAll('.edit-rider-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var riderId = this.getAttribute('data-id');
            var rider = docs.find(function(d) { return d.id === riderId; });
            if (rider) openRiderModal(Object.assign({}, rider.data(), { id: rider.id }));
        });
    });

    document.querySelectorAll('.delete-rider-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var riderId = this.getAttribute('data-id');
            if (confirm('Delete this rider?')) {
                deleteDoc(doc(db, 'riders', riderId)).then(function() {
                    showToast('Rider deleted', 'success');
                });
            }
        });
    });
}

/* ============================================================
   UTILITIES
   ============================================================ */
function getStatusBadge(status) {
    var color = '#888';
    if (status === 'Order Received') color = '#3498db';
    else if (status === 'Preparing') color = '#f39c12';
    else if (status === 'Out for Delivery') color = '#e74c3c';
    else if (status === 'Delivered') color = '#27ae60';
    return '<span style="background:' + color + ';color:#fff;padding:4px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">' + status + '</span>';
}

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
    var toast = document.createElement('div');
    toast.className = 'admin-toast ' + type;
    toast.innerHTML = '<i class="fas ' + (type === 'success' ? 'fa-check-circle' : 'fa-times-circle') + '"></i>' + message;
    container.appendChild(toast);
    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 3000);
}
