/* ============================================================
   FIREBASE SHARED MODULE — Single Source of Truth
   Richy's Eat (Richy's Eat)
   ------------------------------------------------------------
   All Firebase initialization, auth, and Firestore helpers
   are centralized here to eliminate duplication and ensure
   every module uses the exact same app instance.
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    GoogleAuthProvider,
    GithubAuthProvider,
    OAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    sendPasswordResetEmail,
    User
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
    where,
    orderBy,
    onSnapshot,
    arrayUnion,
    serverTimestamp,
    enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---- Firebase web config (single source of truth) ---- */
export const firebaseConfig = {
    apiKey: "AIzaSyDb7Sys_Mh_BLOr1YfB6Kug_9K6_IuLoqg",
    authDomain: "fire-c1a91.firebaseapp.com",
    projectId: "fire-c1a91",
    storageBucket: "fire-c1a91.firebasestorage.app",
    messagingSenderId: "757687516476",
    appId: "1:757687516476:web:e41f779542e841d0ab3239"
};

/* ---- Initialize ONCE and share the same instances ---- */
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/* Enable offline persistence for better reliability */
enableIndexedDbPersistence(db).catch(function(err) {
    if (err.code === 'failed-precondition') {
        console.warn('[firebase-shared] Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
        console.warn('[firebase-shared] Browser does not support persistence.');
    }
});

/* Expose for WebSocket sync client and debugging */
window.auth = auth;
window.db = db;

/* ============================================================
   ORDER ENGINE — Canonical Status Constants & Helpers
   ============================================================ */
export const ORDER_STATUS = Object.freeze({
    PENDING: "Pending",
    APPROVED: "Approved",
    ASSIGNED: "Assigned",
    RIDER_ACCEPTED: "Rider Accepted",
    PREPARING: "Preparing",
    PICKED_UP: "Picked Up",
    ON_THE_WAY: "On The Way",
    NEAR_CUSTOMER: "Near Customer",
    DELIVERED: "Delivered",
    COMPLETED: "Completed"
});

export const ORDER_STATUS_ALT = Object.freeze({
    REJECTED: "Rejected",
    PAUSED: "Paused",
    CANCELLED: "Cancelled",
    RETURNED: "Returned",
    REFUNDED: "Refunded"
});

export const ALL_STATUSES = Object.freeze({ ...ORDER_STATUS, ...ORDER_STATUS_ALT });

export const TRANSITIONS = Object.freeze({
    "Pending": ["Approved", "Rejected", "Cancelled"],
    "Approved": ["Assigned", "Preparing", "Paused", "Cancelled"],
    "Assigned": ["Rider Accepted", "Paused", "Returned", "Cancelled"],
    "Rider Accepted": ["Preparing", "Paused", "Returned", "Cancelled"],
    "Preparing": ["Picked Up", "Paused", "Cancelled"],
    "Picked Up": ["On The Way", "Cancelled", "Returned"],
    "On The Way": ["Near Customer", "Cancelled", "Returned"],
    "Near Customer": ["Delivered", "Cancelled", "Returned"],
    "Delivered": ["Completed", "Refunded"],
    "Completed": ["Refunded"],
    "Rejected": ["Pending"],
    "Paused": ["Approved", "Preparing", "Assigned"],
    "Cancelled": ["Pending"],
    "Returned": ["Assigned", "Pending"],
    "Refunded": []
});

export function canTransition(current, next) {
    if (!current || !next) return false;
    if (current === next) return false;
    const allowed = TRANSITIONS[current] || [];
    return allowed.includes(next);
}

export function nextStatuses(current) {
    return TRANSITIONS[current] || [];
}

export function deliveryStatusFor(status) {
    switch (status) {
        case "Picked Up": return "picked_up";
        case "On The Way":
        case "Near Customer": return "on_the_way";
        case "Delivered":
        case "Completed": return "delivered";
        case "Assigned":
        case "Rider Accepted":
        case "Preparing": return "assigned";
        default: return "pending";
    }
}

export function normalizeStatus(raw) {
    if (!raw) return "Pending";
    const s = String(raw).trim().toLowerCase();
    const map = {
        "order received": "Pending", "received": "Pending", "pending": "Pending",
        "approved": "Approved", "assigned": "Assigned",
        "rider accepted": "Rider Accepted", "preparing": "Preparing",
        "picked up": "Picked Up", "out for delivery": "On The Way",
        "on the way": "On The Way", "near customer": "Near Customer",
        "delivered": "Delivered", "completed": "Completed",
        "rejected": "Rejected", "paused": "Paused",
        "cancelled": "Cancelled", "canceled": "Cancelled",
        "returned": "Returned", "refunded": "Refunded"
    };
    return map[s] || raw;
}

export function isValidStatus(status) {
    const s = String(status || "").trim();
    return Object.values(ALL_STATUSES).includes(s);
}

/* ============================================================
   ROLE HELPERS
   ============================================================ */
export const ADMIN_EMAIL = "rashlast395@gmail.com";
export const ADMIN_NAME = "rashlast395-prog";

export function isAdmin(user) {
    if (!user) return false;
    return user.email === ADMIN_EMAIL || user.displayName === ADMIN_NAME;
}

export function isRider(user) {
    /* Returns a promise that resolves to true if the user is a rider */
    if (!user || !db) return Promise.resolve(false);
    return getDocs(query(collection(db, "riders"), where("uid", "==", user.uid), limit(1)))
        .then(function(snap) { return !snap.empty; })
        .catch(function() { return false; });
}

export function getUserRole(user) {
    if (!user) return "customer";
    if (isAdmin(user)) return "admin";
    return "customer"; /* riders resolved async via isRider() */
}

/* ============================================================
   AUTH HELPERS
   ============================================================ */
export function socialSignIn(provider) {
    return signInWithPopup(auth, provider).catch(function(err) {
        if (err && (err.code === 'auth/popup-blocked' ||
                    err.code === 'auth/popup-closed-by-user' ||
                    err.code === 'auth/unauthorized-domain')) {
            return signInWithRedirect(auth, provider);
        }
        throw err;
    });
}

export const YussifAuth = {
    signUp: function(name, email, password) {
        return createUserWithEmailAndPassword(auth, email, password)
            .then(function(cred) {
                if (updateProfile && cred.user) {
                    return updateProfile(cred.user, { displayName: name }).then(function() { return cred.user; });
                }
                return cred.user;
            })
            .then(function(user) {
                return ensureCustomerProfile(user).then(function() {
                    return setDoc(doc(db, "users", user.uid), {
                        name: name, email: email, role: 'customer'
                    }, { merge: true }).then(function() { return user; });
                });
            });
    },

    login: function(email, password) {
        return signInWithEmailAndPassword(auth, email, password)
            .then(function(cred) { return cred.user; });
    },

    resetPassword: function(email) {
        return sendPasswordResetEmail(auth, email);
    },

    logout: function() {
        return signOut(auth);
    },

    loginWithGoogle: function() {
        var provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        return socialSignIn(provider);
    },

    loginWithGithub: function() {
        var provider = new GithubAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        return socialSignIn(provider);
    },

    handleRedirect: function() {
        return getRedirectResult(auth).then(function(result) {
            return result ? result.user : null;
        }).catch(function() { return null; });
    },

    onState: function(callback) {
        onAuthStateChanged(auth, function(user) {
            if (user) {
                callback({
                    name: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
                    email: user.email || '',
                    uid: user.uid
                });
            } else {
                callback(null);
            }
        });
    },

    routeUser: function(user) {
        if (!user) return 'customer';
        if (isAdmin(user)) return 'admin';
        return 'customer'; /* riders resolved async */
    }
};

/* ============================================================
   CUSTOMER PROFILE HELPERS
   ============================================================ */
export function ensureCustomerProfile(user) {
    if (!user) return Promise.resolve();
    var ref = doc(db, "users", user.uid);
    return getDoc(ref).then(function(snap) {
        if (snap.exists() && snap.data().customerId) return;
        var customerId = "CUST-" + user.uid.slice(0, 8).toUpperCase();
        return setDoc(ref, {
            customerId: customerId,
            name: user.displayName || (user.email ? user.email.split('@')[0] : 'Customer'),
            email: user.email || '',
            phone: user.phoneNumber || '',
            role: 'customer',
            orderHistory: [],
            reservationHistory: [],
            addresses: [],
            wishlist: [],
            rewardPoints: 0,
            createdAt: serverTimestamp()
        }, { merge: true });
    }).catch(function() {});
}

/* ============================================================
   ORDER HELPERS
   ============================================================ */
export function generateOrderId() {
    return 'SB-' + Math.floor(1000 + Math.random() * 9000);
}

export function saveOrder(order) {
    var user = auth.currentUser;
    var orderId = order.id || generateOrderId();
    var base = user ? collection(db, "users", user.uid, "orders") : collection(db, "guest_orders");
    var payload = Object.assign({}, order, {
        id: orderId,
        uid: user ? user.uid : null,
        status: normalizeStatus(order.status) || "Pending",
        deliveryStatus: deliveryStatusFor(order.status || "Pending"),
        statusHistory: order.statusHistory || [{ status: normalizeStatus(order.status) || "Pending", at: serverTimestamp(), by: user ? user.uid : "system" }],
        createdAt: serverTimestamp()
    });
    var savePromise = setDoc(doc(base, orderId), payload, { merge: true }).catch(function () {
        return addDoc(base, payload);
    });
    return savePromise.then(function () {
        var topPayload = Object.assign({}, payload);
        delete topPayload.uid;
        return setDoc(doc(db, "orders", orderId), topPayload, { merge: true });
    });
}

export function updateOrder(orderId, changes) {
    var p1 = updateDoc(doc(db, "orders", orderId), changes).catch(function () {});
    var p2 = getDoc(doc(db, "orders", orderId)).then(function (snap) {
        var uid = snap.exists() ? snap.data().uid : null;
        if (!uid) return;
        return updateDoc(doc(db, "users", uid, "orders", orderId), changes).catch(function () {});
    }).catch(function () {});
    return Promise.all([p1, p2]);
}

export function pushStatusHistory(orderId, status, by) {
    var entry = { status: status, at: serverTimestamp(), by: by || "system" };
    var p1 = updateDoc(doc(db, "orders", orderId), { statusHistory: arrayUnionSafe(entry) }).catch(function () {});
    var p2 = getDoc(doc(db, "orders", orderId)).then(function (snap) {
        var uid = snap.exists() ? snap.data().uid : null;
        if (!uid) return;
        return updateDoc(doc(db, "users", uid, "orders", orderId), { statusHistory: arrayUnionSafe(entry) }).catch(function () {});
    }).catch(function () {});
    return Promise.all([p1, p2]);
}

export function assignRider(orderId, riderDoc) {
    var changes = {
        riderId: riderDoc.uid || null,
        riderName: riderDoc.name || "Rider",
        riderPhone: riderDoc.phone || "",
        riderVehicle: riderDoc.vehicle || "",
        deliveryStatus: "assigned",
        status: "Assigned",
        assignedAt: serverTimestamp()
    };
    return updateOrder(orderId, changes).then(function () {
        return pushStatusHistory(orderId, "Assigned", "admin");
    });
}

export function notify(data) {
    var payload = Object.assign({ createdAt: serverTimestamp(), read: false }, data);
    return addDoc(collection(db, "notifications"), payload).catch(function () {});
}

export function logActivity(data) {
    var payload = Object.assign({ createdAt: serverTimestamp() }, data);
    return addDoc(collection(db, "activityLogs"), payload).catch(function () {});
}

export function subscribeCustomerOrders(callback) {
    var user = auth.currentUser;
    if (!user) { callback([]); return function () {}; }
    var col = collection(db, "users", user.uid, "orders");
    var q = query(col, orderBy("createdAt", "desc"));
    return onSnapshot(q, function (snap) {
        var list = [];
        snap.forEach(function (d) { list.push(d.data()); });
        callback(list);
    }, function () { callback([]); });
}

export function loadOrders(callback) {
    var user = auth.currentUser;
    if (!user) { callback([]); return; }
    var col = collection(db, "users", user.uid, "orders");
    var q = query(col, orderBy("createdAt", "desc"));
    getDocs(q)
        .then(function (snap) {
            var list = [];
            snap.forEach(function (d) { list.push(d.data()); });
            callback(list);
        })
        .catch(function () { callback([]); });
}

export function subscribeCustomerReservations(callback) {
    var user = auth.currentUser;
    if (!user) { callback([]); return function () {}; }
    var col = collection(db, "users", user.uid, "reservations");
    var q = query(col, orderBy("createdAt", "desc"));
    return onSnapshot(q, function (snap) {
        var list = [];
        snap.forEach(function (d) { list.push(d.data()); });
        callback(list);
    }, function () { callback([]); });
}

export function subscribeCustomerNotifications(callback) {
    var user = auth.currentUser;
    if (!user) { callback([]); return function () {}; }
    var col = collection(db, "users", user.uid, "notifications");
    var q = query(col, orderBy("createdAt", "desc"));
    return onSnapshot(q, function (snap) {
        var list = [];
        snap.forEach(function (d) { list.push(d.data()); });
        callback(list);
    }, function () { callback([]); });
}

export function saveReservation(reservation) {
    var user = auth.currentUser;
    var resvId = reservation.id || ('RES-' + Math.floor(1000 + Math.random() * 9000));
    var base = user ? collection(db, "users", user.uid, "reservations") : collection(db, "reservations");
    var payload = Object.assign({}, reservation, {
        id: resvId,
        uid: user ? user.uid : null,
        status: reservation.status || 'pending',
        statusHistory: reservation.statusHistory || [{ status: 'pending', at: serverTimestamp(), by: 'customer' }],
        createdAt: serverTimestamp()
    });
    var savePromise = setDoc(doc(base, resvId), payload, { merge: true }).catch(function () {
        return addDoc(base, payload);
    });
    return savePromise.then(function () {
        var topPayload = Object.assign({}, payload);
        delete topPayload.uid;
        return setDoc(doc(db, "reservations", resvId), topPayload, { merge: true });
    });
}

export function saveContactMessage(message) {
    var payload = Object.assign({}, message, { createdAt: serverTimestamp() });
    return addDoc(collection(db, "contactMessages"), payload);
}

export function setAddress(id, address) {
    var user = auth.currentUser;
    if (!user) return Promise.resolve();
    return setDoc(doc(db, "users", user.uid, "addresses", id), address);
}

export function deleteAddress(id) {
    var user = auth.currentUser;
    if (!user) return Promise.resolve();
    return deleteDoc(doc(db, "users", user.uid, "addresses", id)).catch(function () {
        return Promise.resolve();
    });
}

export function loadAddresses(callback) {
    var user = auth.currentUser;
    if (!user) { callback([]); return; }
    getDocs(collection(db, "users", user.uid, "addresses"))
        .then(function (snap) {
            var list = [];
            snap.forEach(function (d) { list.push(d.data()); });
            callback(list);
        })
        .catch(function () { callback([]); });
}

export function saveProfile(profile) {
    var user = auth.currentUser;
    if (!user) return Promise.resolve();
    return ensureCustomerProfile(user).then(function () {
        return setDoc(doc(db, "users", user.uid), profile, { merge: true });
    });
}

/* ============================================================
   ARRAY UNION SAFE HELPER
   ============================================================ */
function arrayUnionSafe(entry) {
    if (typeof arrayUnion === "function") return arrayUnion(entry);
    return entry;
}

/* ============================================================
   SEED MENU ITEMS
   ============================================================ */
function seedMenu() {
    getDocs(collection(db, 'menu')).then(function(snap) {
        if (snap.empty) {
            var defaultItems = [
                { name: 'Classic Smash Burger', category: 'Burgers', price: 14.99, image: 'img/menu/1.jpg', desc: 'Double smashed patty, cheddar, caramelized onions, pickles & special sauce', rating: '4.9', reviews: '128' },
                { name: 'Margherita Royale', category: 'Pizza', price: 19.99, image: 'img/menu/2.jpg', desc: 'San Marzano tomatoes, buffalo mozzarella, basil & truffle oil on sourdough', rating: '4.8', reviews: '95' },
                { name: 'Nashville Hot Chicken', category: 'Chicken', price: 12.99, image: 'img/menu/3.jpg', desc: 'Crispy fried chicken in fiery Nashville spice blend with honey drizzle', rating: '5.0', reviews: '210' },
                { name: 'Loaded Fajita Wrap', category: 'Wraps', price: 10.99, image: 'img/menu/4.jpg', desc: 'Grilled chicken, peppers, sour cream & guacamole in a warm tortilla', rating: '4.5', reviews: '74' },
                { name: 'Nutella Lava Cake', category: 'Desserts', price: 8.99, image: 'img/menu/5.jpg', desc: 'Molten chocolate cake with Nutella center, vanilla ice cream & caramel', rating: '4.9', reviews: '56' },
                { name: 'Truffle Mushroom Pasta', category: 'Pasta', price: 16.99, image: 'img/menu/6.jpg', desc: 'Al dente tagliatelle, wild mushrooms, black truffle, parmesan & thyme', rating: '4.9', reviews: '88' }
            ];
            defaultItems.forEach(function(item) {
                addDoc(collection(db, 'menu'), item).catch(function() {});
            });
        }
    }).catch(function() {});
}
seedMenu();

/* ============================================================
   UTILITY: Human-readable Firebase error messages
   ============================================================ */
export function firebaseErr(err) {
    var code = (err && err.code) ? err.code : '';
    switch (code) {
        case 'auth/email-already-in-use': return 'An account with this email already exists';
        case 'auth/invalid-email': return 'Please enter a valid email';
        case 'auth/weak-password': return 'Password must be at least 6 characters';
        case 'auth/user-not-found': return 'No account found. Please sign up.';
        case 'auth/wrong-password': return 'Incorrect password. Try again.';
        case 'auth/invalid-credential': return 'Incorrect email or password.';
        case 'auth/too-many-requests': return 'Too many attempts. Try again later.';
        case 'auth/operation-not-allowed': return 'This sign-in method is not enabled in Firebase.';
        case 'auth/unauthorized-domain': return 'Add this site domain to Firebase -> Authentication -> Authorized domains.';
        case 'auth/missing-email': return 'Please enter your email address.';
        case 'auth/user-disabled': return 'This account has been disabled. Contact support.';
        default: return (err && err.message) ? err.message : 'Something went wrong. Please try again.';
    }
}
