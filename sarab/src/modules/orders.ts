/* ============================================================
   ORDERS MODULE
   Centralized order management logic
   ============================================================ */

import {
  db,
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
  serverTimestamp
} from '../../js/firebase-shared.js';

export interface OrderFilters {
  status?: string;
  deliveryStatus?: string;
  riderId?: string;
  customerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class OrderModule {
  private unsubscribers: Map<string, () => void> = new Map();

  subscribeAllOrders(callback: (orders: any[]) => void): () => void {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(orders);
    }, (err) => {
      console.error('Orders listener error:', err);
      callback([]);
    });
    const key = 'all';
    this.unsubscribers.set(key, unsub);
    return unsub;
  }

  subscribeCustomerOrders(customerId: string, callback: (orders: any[]) => void): () => void {
    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', customerId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(orders);
    }, (err) => {
      console.error('Customer orders listener error:', err);
      callback([]);
    });
    const key = `customer-${customerId}`;
    this.unsubscribers.set(key, unsub);
    return unsub;
  }

  subscribeRiderOrders(riderId: string, callback: (orders: any[]) => void): () => void {
    const q = query(
      collection(db, 'orders'),
      where('riderId', '==', riderId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(orders);
    }, (err) => {
      console.error('Rider orders listener error:', err);
      callback([]);
    });
    const key = `rider-${riderId}`;
    this.unsubscribers.set(key, unsub);
    return unsub;
  }

  subscribeAvailableOrders(callback: (orders: any[]) => void): () => void {
    const q = query(
      collection(db, 'orders'),
      where('deliveryStatus', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(orders);
    }, (err) => {
      console.error('Available orders listener error:', err);
      callback([]);
    });
    const key = 'available';
    this.unsubscribers.set(key, unsub);
    return unsub;
  }

  getOrder(orderId: string): Promise<any> {
    return getDoc(doc(db, 'orders', orderId)).then(snap => {
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() };
    });
  }

  async updateStatus(orderId: string, status: string, actor: string): Promise<void> {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status,
      updatedAt: serverTimestamp()
    });
  }

  async assignRider(orderId: string, riderId: string, riderName: string, riderPhone: string, riderVehicle: string): Promise<void> {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      riderId,
      riderName,
      riderPhone,
      riderVehicle,
      status: 'Assigned',
      deliveryStatus: 'assigned',
      assignedAt: serverTimestamp()
    });
  }

  cleanup(): void {
    this.unsubscribers.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this.unsubscribers.clear();
  }
}

export const orderModule = new OrderModule();
