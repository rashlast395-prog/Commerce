/* ============================================================
   UNIFIED ORDER ENGINE — the single source of truth for the
   order lifecycle across Customer, Admin, and Rider dashboards.

   This file is intentionally framework-free and is imported by
   BOTH the Node sync server and the browser client (rt-sync.js
   re-declares a mirror so the browser does not need a build step).

   Goal: every role sees the SAME status vocabulary, the SAME
   allowed transitions, and the SAME event names. No more
   "Pending" on one screen and "Order Received" on another.
   ============================================================ */

/* ---- Canonical order lifecycle ---- */
export const ORDER_STATUS = {
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
};

/* ---- Alternative / terminal statuses ---- */
export const ORDER_STATUS_ALT = {
  REJECTED: "Rejected",
  PAUSED: "Paused",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
  REFUNDED: "Refunded"
};

export const ALL_STATUSES = { ...ORDER_STATUS, ...ORDER_STATUS_ALT };

/* Human-readable labels + which role normally triggers them. */
export const STATUS_META = {
  Pending:        { label: "Pending",        role: "customer", color: "#f39c12" },
  Approved:       { label: "Approved",       role: "admin",    color: "#27ae60" },
  Assigned:       { label: "Assigned",       role: "admin",    color: "#2e86de" },
  "Rider Accepted":{ label: "Rider Accepted",role: "rider",    color: "#2e86de" },
  Preparing:      { label: "Preparing",      role: "admin",    color: "#f39c12" },
  "Picked Up":    { label: "Picked Up",      role: "rider",    color: "#2e86de" },
  "On The Way":   { label: "On The Way",     role: "rider",    color: "#e74c3c" },
  "Near Customer":{ label: "Near Customer",  role: "rider",    color: "#e74c3c" },
  Delivered:      { label: "Delivered",      role: "rider",    color: "#27ae60" },
  Completed:      { label: "Completed",      role: "admin",    color: "#27ae60" },
  Rejected:       { label: "Rejected",       role: "admin",    color: "#e74c3c" },
  Paused:         { label: "Paused",         role: "admin",    color: "#888" },
  Cancelled:      { label: "Cancelled",      role: "admin",    color: "#888" },
  Returned:       { label: "Returned",       role: "admin",    color: "#e74c3c" },
  Refunded:       { label: "Refunded",       role: "admin",    color: "#9b59b6" }
};

/* ---- Allowed status transitions (state machine) ---- */
export const TRANSITIONS = {
  Pending:    ["Approved", "Rejected", "Cancelled"],
  Approved:   ["Assigned", "Preparing", "Paused", "Cancelled"],
  Assigned:   ["Rider Accepted", "Paused", "Returned", "Cancelled"],
  "Rider Accepted": ["Preparing", "Paused", "Returned", "Cancelled"],
  Preparing:  ["Picked Up", "Paused", "Cancelled"],
  "Picked Up":["On The Way", "Cancelled", "Returned"],
  "On The Way":["Near Customer", "Cancelled", "Returned"],
  "Near Customer":["Delivered", "Cancelled", "Returned"],
  Delivered:  ["Completed", "Refunded"],
  Completed:  ["Refunded"],
  /* Terminal-but-reversible-by-admin states */
  Rejected:   ["Pending"],
  Paused:     ["Approved", "Preparing", "Assigned"],
  Cancelled:  ["Pending"],
  Returned:   ["Assigned", "Pending"],
  Refunded:   []
};

/* Can a given role move an order INTO `next` from `current`? */
export function canTransition(current, next) {
  if (!current || !next) return false;
  if (current === next) return false;
  const allowed = TRANSITIONS[current] || [];
  return allowed.includes(next);
}

export function nextStatuses(current) {
  return TRANSITIONS[current] || [];
}

/* ---- Real-time event names (server -> clients) ---- */
export const EVENTS = {
  ORDER_CREATED: "order:created",
  ORDER_UPDATED: "order:updated",
  ORDER_STATUS: "order:status",
  RIDER_ASSIGNED: "order:assigned",
  RIDER_DECLINED: "order:declined",
  TRACKING: "order:tracking",
  NOTIFICATION: "notification",
  RIDER_LOCATION: "rider:location",
  PRESENCE: "presence",
  SNAPSHOT: "snapshot"
};

/* ---- Client -> server command names ---- */
export const COMMANDS = {
  AUTH: "auth",
  CREATE_ORDER: "order:create",
  UPDATE_ORDER: "order:update",
  SET_STATUS: "order:setStatus",
  ASSIGN_RIDER: "order:assign",
  DECLINE_RIDER: "order:decline",
  UPDATE_TRACKING: "order:tracking:update",
  RIDER_LOCATION: "rider:location:update",
  MARK_NOTIF: "notification:mark",
  PING: "ping"
};

/* Derive the deliveryStatus shown to riders from an order status. */
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

/* Map a legacy status string to the canonical one (migration helper). */
export function normalizeStatus(raw) {
  if (!raw) return "Pending";
  const s = String(raw).trim().toLowerCase();
  const map = {
    "order received": "Pending",
    "received": "Pending",
    "pending": "Pending",
    "approved": "Approved",
    "assigned": "Assigned",
    "rider accepted": "Rider Accepted",
    "preparing": "Preparing",
    "picked up": "Picked Up",
    "out for delivery": "On The Way",
    "on the way": "On The Way",
    "near customer": "Near Customer",
    "delivered": "Delivered",
    "completed": "Completed",
    "rejected": "Rejected",
    "paused": "Paused",
    "cancelled": "Cancelled",
    "canceled": "Cancelled",
    "returned": "Returned",
    "refunded": "Refunded"
  };
  return map[s] || raw;
}
