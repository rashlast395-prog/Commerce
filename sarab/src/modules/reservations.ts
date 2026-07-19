/* ============================================================
   RESERVATIONS MODULE
   Centralized reservation management logic
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

export class ReservationsModule {
  private unsubscribers: Map<string, () => void> = new Map();

  subscribeAll(callback: (reservations: any[]) => void): () => void {
    const q = query(collection(db, 'reservations'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const reservations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(reservations);
    }, (err) => {
      console.error('Reservations listener error:', err);
      callback([]);
    });
    this.unsubscribers.set('all', unsub);
    return unsub;
  }

  subscribeCustomerReservations(customerId: string, callback: (reservations: any[]) => void): () => void {
    const q = query(
      collection(db, 'reservations'),
      where('customerId', '==', customerId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const reservations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(reservations);
    }, (err) => {
      console.error('Customer reservations listener error:', err);
      callback([]);
    });
    this.unsubscribers.set(`customer-${customerId}`, unsub);
    return unsub;
  }

  async updateStatus(reservationId: string, status: 'approved' | 'declined'): Promise<void> {
    const ref = doc(db, 'reservations', reservationId);
    await updateDoc(ref, {
      status,
      updatedAt: serverTimestamp()
    });
  }

  cleanup(): void {
    this.unsubscribers.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this.unsubscribers.clear();
  }
}

export const reservationsModule = new ReservationsModule();
