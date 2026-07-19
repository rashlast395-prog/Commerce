/* ============================================================
   RIDERS MODULE
   Centralized rider management logic
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
  orderBy,
  onSnapshot,
  serverTimestamp
} from '../../js/firebase-shared.js';

export interface RiderData {
  name: string;
  email: string;
  phone: string;
  vehicle: string;
  license: string;
  available?: boolean;
  uid?: string;
}

export class RidersModule {
  private unsubscribers: Map<string, () => void> = new Map();

  subscribeAll(callback: (riders: any[]) => void): () => void {
    const q = query(collection(db, 'riders'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const riders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(riders);
    }, (err) => {
      console.error('Riders listener error:', err);
      callback([]);
    });
    this.unsubscribers.set('all', unsub);
    return unsub;
  }

  getRider(riderId: string): Promise<any> {
    return getDoc(doc(db, 'riders', riderId)).then(snap => {
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() };
    });
  }

  async createRider(data: RiderData): Promise<string> {
    const ref = await addDoc(collection(db, 'riders'), {
      ...data,
      available: false,
      createdAt: serverTimestamp()
    });
    return ref.id;
  }

  async updateRider(riderId: string, data: Partial<RiderData>): Promise<void> {
    await updateDoc(doc(db, 'riders', riderId), data);
  }

  async deleteRider(riderId: string): Promise<void> {
    await deleteDoc(doc(db, 'riders', riderId));
  }

  async updateAvailability(riderId: string, available: boolean): Promise<void> {
    await updateDoc(doc(db, 'riders', riderId), { available });
  }

  cleanup(): void {
    this.unsubscribers.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this.unsubscribers.clear();
  }
}

export const ridersModule = new RidersModule();
