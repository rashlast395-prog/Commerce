/* ============================================================
   MENU MODULE
   Centralized menu management logic
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
  onSnapshot
} from '../../js/firebase-shared.js';

export interface MenuItemData {
  name: string;
  category: string;
  price: number;
  image: string;
  desc?: string;
  rating?: string;
  reviews?: string;
  tags?: string[];
  available?: boolean;
}

export class MenuModule {
  private unsubscribers: Map<string, () => void> = new Map();

  subscribeAll(callback: (items: any[]) => void): () => void {
    const q = query(collection(db, 'menu'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(items);
    }, (err) => {
      console.error('Menu listener error:', err);
      callback([]);
    });
    this.unsubscribers.set('all', unsub);
    return unsub;
  }

  getItem(itemId: string): Promise<any> {
    return getDoc(doc(db, 'menu', itemId)).then(snap => {
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() };
    });
  }

  async createItem(data: MenuItemData): Promise<string> {
    const ref = await addDoc(collection(db, 'menu'), {
      ...data,
      createdAt: new Date()
    });
    return ref.id;
  }

  async updateItem(itemId: string, data: Partial<MenuItemData>): Promise<void> {
    await updateDoc(doc(db, 'menu', itemId), data);
  }

  async deleteItem(itemId: string): Promise<void> {
    await deleteDoc(doc(db, 'menu', itemId));
  }

  cleanup(): void {
    this.unsubscribers.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this.unsubscribers.clear();
  }
}

export const menuModule = new MenuModule();
