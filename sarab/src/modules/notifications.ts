/* ============================================================
   NOTIFICATIONS MODULE
   In-app notifications management
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

export interface Notification {
  id?: string;
  uid?: string;
  riderId?: string;
  type: 'order' | 'rider' | 'system' | 'promotion';
  title: string;
  body: string;
  orderId?: string;
  read: boolean;
  createdAt: Date;
}

export class NotificationsModule {
  private unsubscribers: Map<string, () => void> = new Map();

  subscribeUserNotifications(uid: string, callback: (notifications: Notification[]) => void): () => void {
    const q = query(
      collection(db, 'users', uid, 'notifications'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const notifications = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(notifications);
    }, (err) => {
      console.error('Notifications listener error:', err);
      callback([]);
    });
    this.unsubscribers.set(`user-${uid}`, unsub);
    return unsub;
  }

  async create(data: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<string> {
    const ref = await addDoc(collection(db, 'notifications'), {
      ...data,
      read: false,
      createdAt: serverTimestamp()
    });
    return ref.id;
  }

  async createForUser(uid: string, data: Omit<Notification, 'id' | 'createdAt' | 'read' | 'uid'>): Promise<void> {
    const ref = doc(db, 'users', uid, 'notifications');
    const id = 'NTF-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    await setDoc(ref, {
      id,
      ...data,
      uid,
      read: false,
      createdAt: serverTimestamp()
    }, { merge: true });
  }

  async markAsRead(notificationId: string): Promise<void> {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  }

  async markAllAsRead(uid: string): Promise<void> {
    const q = query(
      collection(db, 'users', uid, 'notifications'),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    const batch: Promise<void>[] = [];
    snap.docs.forEach(d => {
      batch.push(updateDoc(d.ref, { read: true }));
    });
    await Promise.all(batch);
  }

  async getUnreadCount(uid: string): Promise<number> {
    const q = query(
      collection(db, 'users', uid, 'notifications'),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    return snap.size;
  }

  cleanup(): void {
    this.unsubscribers.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this.unsubscribers.clear();
  }
}

export const notificationsModule = new NotificationsModule();
