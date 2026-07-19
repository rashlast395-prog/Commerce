export interface Order {
  id: string;
  customerId: string;
  uid: string;
  customer: string;
  email: string;
  phone?: string;
  items: any[];
  itemLines: string[];
  subtotal: number;
  total: number;
  discount?: number;
  deliveryFee?: number;
  coupon?: string;
  payment: any;
  method: string;
  paymentId: string;
  paymentStatus?: string;
  status: string;
  deliveryStatus: string;
  statusHistory: any[];
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
  tracking?: any;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
  completedAt?: Date;
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
  statusHistory: any[];
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

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  name?: string;
  phone?: string;
  role?: string;
  customerId?: string;
  photoURL?: string;
  createdAt?: Date;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  reply?: any;
  createdAt: Date;
}
