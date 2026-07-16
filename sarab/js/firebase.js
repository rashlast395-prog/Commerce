/* ============================================================
   FIREBASE AUTH — Sign In / Sign Up
   Yussif Eats (Richy's Eat)
   ------------------------------------------------------------
   1. Replace the firebaseConfig values below with your own
      Firebase project settings (Firebase Console -> Project
      Settings -> Your apps -> Web app config).
    2. In the Firebase Console enable Authentication -> Sign-in
       method for: Email/Password, Google, and GitHub.
   3. Add your site domain (and http://localhost) under
      Authentication -> Settings -> Authorized domains.
   4. Enable Firestore Database.
   5. This file is loaded as a <script type="module"> and exposes
      window.YussifAuth / window.YussifFirestore for main.js.
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
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    addDoc,
    deleteDoc,
    getDocs,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---- Firebase web config ---- */
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

/* Seed menu items if collection is empty */
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

/* True when a real Firebase user is signed in (used for Firestore writes) */
window.YussifAuthCurrentUid = function () {
    return auth.currentUser ? auth.currentUser.uid : null;
};

/* ============================================================
   ORDERS / PAYMENTS -> FIRESTORE
   Orders are stored under:  users/{uid}/orders/{orderId}
   (guest fallback path used only if not signed in)
   ============================================================ */
window.YussifFirestore = {
    /* Save a completed purchase/order to Firestore */
    saveOrder: function (order) {
        var user = auth.currentUser;
        var base = user ? collection(db, "users", user.uid, "orders")
                        : collection(db, "guest_orders");
        var payload = Object.assign({}, order, {
            uid: user ? user.uid : null,
            createdAt: serverTimestamp()
        });
        /* Use a stable doc id when provided (e.g. SB-1234) for easy lookup */
        var savePromise;
        if (order.id) {
            savePromise = setDoc(doc(base, order.id), payload).catch(function () {
                return addDoc(base, payload);
            });
        } else {
            savePromise = addDoc(base, payload);
        }
        /* Also mirror to top-level orders collection for admin dashboard */
        return savePromise.then(function(docRef) {
            var topPayload = Object.assign({}, payload);
            delete topPayload.uid;
            topPayload.id = docRef.id;
            return addDoc(collection(db, "orders"), topPayload);
        });
    },

    /* Load all orders for the signed-in user (or empty for guests) */
    loadOrders: function (callback) {
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
    },

    /* Update just the order status in Firestore */
    updateStatus: function (orderId, status) {
        var user = auth.currentUser;
        if (!user) return Promise.resolve();
        return setDoc(doc(db, "users", user.uid, "orders", orderId), { status: status }, { merge: true });
    },

    /* Add/replace a single delivery address (keyed by local id) */
    setAddress: function (id, address) {
        var user = auth.currentUser;
        if (!user) return Promise.resolve();
        return setDoc(doc(db, "users", user.uid, "addresses", id), address);
    },

    /* Remove a single delivery address by local id */
    deleteAddress: function (id) {
        var user = auth.currentUser;
        if (!user) return Promise.resolve();
        return deleteDoc(doc(db, "users", user.uid, "addresses", id)).catch(function () {
            return Promise.resolve();
        });
    },

    /* Load the user's delivery addresses from Firestore (subcollection) */
    loadAddresses: function (callback) {
        var user = auth.currentUser;
        if (!user) { callback([]); return; }
        getDocs(collection(db, "users", user.uid, "addresses"))
            .then(function (snap) {
                var list = [];
                snap.forEach(function (d) { list.push(d.data()); });
                callback(list);
            })
            .catch(function () { callback([]); });
    },

    /* Save the user profile (name, phone, email) to Firestore */
    saveProfile: function (profile) {
        var user = auth.currentUser;
        if (!user) return Promise.resolve();
        return setDoc(doc(db, "users", user.uid), profile, { merge: true });
    },

    /* Check if current user is a rider */
    isRider: function () {
        var user = auth.currentUser;
        if (!user) return Promise.resolve(false);
        return getDocs(collection(db, "riders")).then(function (snap) {
            var found = false;
            snap.forEach(function (d) {
                if (d.data().uid === user.uid) found = true;
            });
            return found;
        });
    },

    /* Save a reservation to Firestore */
    saveReservation: function (reservation) {
        var user = auth.currentUser;
        var base = user ? collection(db, "users", user.uid, "reservations")
                        : collection(db, "reservations");
        var payload = Object.assign({}, reservation, {
            uid: user ? user.uid : null,
            createdAt: serverTimestamp()
        });
        return addDoc(base, payload);
    }
};

/* ============================================================
   AUTH HELPERS (used by main.js)
   Social sign-in works for BOTH login and sign up — Firebase
   creates the account automatically on first social sign-in.
   ============================================================ */
function socialSignIn(provider) {
    /* Popups are blocked on file:// and some embedded views ->
       fall back to a full-page redirect which always works. */
    return signInWithPopup(auth, provider).catch(function (err) {
        if (err && (err.code === 'auth/popup-blocked' ||
                    err.code === 'auth/popup-closed-by-user' ||
                    err.code === 'auth/unauthorized-domain')) {
            return signInWithRedirect(auth, provider);
        }
        throw err;
    });
}

window.YussifAuth = {
    /* Create a new account with email + password and set display name */
    signUp: function (name, email, password) {
        return createUserWithEmailAndPassword(auth, email, password)
            .then(function (cred) {
                if (updateProfile && cred.user) {
                    return updateProfile(cred.user, { displayName: name }).then(function () {
                        return cred.user;
                    });
                }
                return cred.user;
            });
    },

    /* Sign in with existing email + password */
    login: function (email, password) {
        return signInWithEmailAndPassword(auth, email, password)
            .then(function (cred) { return cred.user; });
    },

    /* Send a password reset email (works only for email/password accounts) */
    resetPassword: function (email) {
        return sendPasswordResetEmail(auth, email);
    },

    /* Sign out the current user */
    logout: function () {
        return signOut(auth);
    },

    /* Google sign-in (also creates account on first use = sign up) */
    loginWithGoogle: function () {
        var provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        return socialSignIn(provider);
    },

    /* GitHub sign-in (also creates account on first use = sign up).
       Requires the "GitHub" provider enabled in Firebase. */
    loginWithGithub: function () {
        var provider = new GithubAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        return socialSignIn(provider);
    },

    /* Resolve a redirect-based sign-in (call on page load) */
    handleRedirect: function () {
        return getRedirectResult(auth).then(function (result) {
            return result ? result.user : null;
        }).catch(function () { return null; });
    },

    /* Subscribe to auth state changes. callback receives a user object
       ({ name, email }) or null. */
    onState: function (callback) {
        onAuthStateChanged(auth, function (user) {
            if (user) {
                callback({
                    name: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
                    email: user.email || ''
                });
            } else {
                callback(null);
            }
        });
    },

    /* Route user based on role: admin, rider, or customer */
    routeUser: function (user) {
        if (!user) return 'customer';
        if (user.email === 'rashlast395@gmail.com') return 'admin';
        if (user.displayName === 'rashlast395-prog') return 'admin';
        /* Check if user is a rider */
        if (window.YussifFirestore) {
            return 'customer';
        }
        return 'customer';
    }
};
