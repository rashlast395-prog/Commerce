/* ============================================================
   FIREBASE AUTH — Re-exports from firebase-shared.js
   Richy's Eat (Richy's Eat)
   ============================================================
   This file maintains backward compatibility for classic scripts
   (main.js, rt-sync.js) that rely on window.YussifAuth and
   window.YussifFirestore. All actual implementation lives in
   js/firebase-shared.js.
   ============================================================ */

import {
    app, auth, db, firebaseConfig,
    YussifAuth, ensureCustomerProfile, firebaseErr,
    ORDER_STATUS, ORDER_STATUS_ALT, ALL_STATUSES,
    TRANSITIONS, canTransition, deliveryStatusFor, normalizeStatus, isValidStatus,
    ADMIN_EMAIL, ADMIN_NAME, isAdmin, isRider, getUserRole,
    saveOrder, updateOrder, pushStatusHistory, assignRider,
    notify, logActivity, generateOrderId,
    subscribeCustomerOrders, loadOrders,
    subscribeCustomerReservations, subscribeCustomerNotifications,
    saveReservation, saveContactMessage,
    setAddress, deleteAddress, loadAddresses, saveProfile
} from './firebase-shared.js';

/* Expose for the real-time sync client (rt-sync.js) and debugging */
window.auth = auth;
window.db = db;

/* Backward-compatible globals for classic scripts */
window.YussifAuthCurrentUid = function () {
    return auth.currentUser ? auth.currentUser.uid : null;
};

window.YussifFirestore = {
    saveOrder: saveOrder,
    updateOrder: updateOrder,
    pushStatusHistory: pushStatusHistory,
    assignRider: assignRider,
    notify: notify,
    logActivity: logActivity,
    subscribeCustomerOrders: subscribeCustomerOrders,
    loadOrders: loadOrders,
    subscribeCustomerReservations: subscribeCustomerReservations,
    subscribeCustomerNotifications: subscribeCustomerNotifications,
    saveReservation: saveReservation,
    saveContactMessage: saveContactMessage,
    setAddress: setAddress,
    deleteAddress: deleteAddress,
    loadAddresses: loadAddresses,
    saveProfile: saveProfile,
    ensureCustomerProfile: ensureCustomerProfile,
    generateOrderId: generateOrderId,
    isRider: function() {
        var user = auth.currentUser;
        return user ? isRider(user) : Promise.resolve(false);
    }
};

window.YussifAuth = {
    signUp: YussifAuth.signUp,
    login: YussifAuth.login,
    resetPassword: YussifAuth.resetPassword,
    logout: YussifAuth.logout,
    loginWithGoogle: YussifAuth.loginWithGoogle,
    loginWithGithub: YussifAuth.loginWithGithub,
    handleRedirect: YussifAuth.handleRedirect,
    onState: YussifAuth.onState,
    routeUser: YussifAuth.routeUser
};

/* Expose order status constants globally for backward compatibility */
window.ORDER_STATUS = ORDER_STATUS;
window.ORDER_STATUS_ALT = ORDER_STATUS_ALT;
window.ALL_STATUSES = ALL_STATUSES;
window.canTransition = canTransition;
window.normalizeStatus = normalizeStatus;
window.deliveryStatusFor = deliveryStatusFor;

/* Expose role helpers */
window.isAdmin = isAdmin;
window.isRider = isRider;
window.getUserRole = getUserRole;
window.ADMIN_EMAIL = ADMIN_EMAIL;
window.ADMIN_NAME = ADMIN_NAME;
