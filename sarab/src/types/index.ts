/* ============================================================
   CORE TYPE DEFINITIONS
   Shared TypeScript interfaces for the entire application
   ============================================================ */

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  name?: string;
  phone?: string;
  role?: 'customer' | 'admin' | 'rider';
  customerId?: string;
  photoURL?: string;
  createdAt?: Date;
}

export interface Address {
  id: string;
  label?: string;
  street: string;
  city: string;
  zip: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  desc?: string;
  rating?: string;
  reviews?: string;
  tags?: string[];
  available?: boolean;
  createdAt?: Date;
}

export interface OrderItem {
  title: string;
  qty: number;
  price: number;
  size?: string;
  spice?: string;
  extras?: string[];
}

export interface Order {
  id: string;
  customerId: string;
  uid: string;
  customer: string;
  email: string;
  phone?: string;
  items: OrderItem[];
  itemLines: string[];
  subtotal: number;
  total: number;
  discount?: number;
  deliveryFee?: number;
  coupon?: string;
  payment: PaymentInfo;
  method: string;
  paymentId: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  status: string;
  deliveryStatus: string;
  statusHistory: StatusHistoryEntry[];
  address: string;
  city: string;
  zip: string;
  lat?: number;
  lng?: number;
  riderId?: string;
  riderUid?: string;
  riderName?: string;
  riderPhone?: string;
  riderVehicle?: string;
  tracking?: TrackingInfo;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
  completedAt?: Date;
}

export interface PaymentInfo {
  method: string;
  provider?: string;
  phone?: string;
  cardLast4?: string;
  cardName?: string;
  bankRef?: string;
  bankName?: string;
  transactionId?: string;
}

export interface StatusHistoryEntry {
  status: string;
  at: string;
  by: string;
}

export interface TrackingInfo {
  lat: number | null;
  lng: number | null;
  eta: string | null;
  updatedAt: string;
}

export interface Reservation {
  id: string;
  customerId: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  notes?: string;
  status: 'pending' | 'approved' | 'declined';
  statusHistory: StatusHistoryEntry[];
  createdAt: Date;
}

export interface Rider {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  vehicle: string;
  license: string;
  available: boolean;
  currentOrderId?: string;
  lat?: number;
  lng?: number;
  lastSeen?: Date;
  rating?: number;
  completedDeliveries?: number;
  totalEarnings?: number;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  reply?: {
    to: string;
    subject: string;
    body: string;
    repliedAt: Date;
  };
  createdAt: Date;
}

export interface Notification {
  id: string;
  uid?: string;
  riderId?: string;
  type: 'order' | 'rider' | 'system' | 'promotion';
  title: string;
  body: string;
  orderId?: string;
  read: boolean;
  createdAt: Date;
}

export interface ActivityLog {
  id: string;
  type: string;
  orderId?: string;
  actor: string;
  detail: string;
  createdAt: Date;
}
