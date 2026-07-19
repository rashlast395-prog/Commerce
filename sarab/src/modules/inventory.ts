/* ============================================================
   INVENTORY MODULE
   Inventory management and stock tracking
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

export interface InventoryItem {
  id?: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  costPerUnit: number;
  supplier?: string;
  lastRestocked?: Date;
}

export class InventoryModule {
  private unsubscribers: Map<string, () => void> = new Map();

  subscribeAll(callback: (items: any[]) => void): () => void {
    const q = query(collection(db, 'inventory'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(items);
    }, (err) => {
      console.error('Inventory listener error:', err);
      callback([]);
    });
    this.unsubscribers.set('all', unsub);
    return unsub;
  }

  async addItem(data: Omit<InventoryItem, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, 'inventory'), {
      ...data,
      createdAt: serverTimestamp()
    });
    return ref.id;
  }

  async updateItem(itemId: string, data: Partial<InventoryItem>): Promise<void> {
    await updateDoc(doc(db, 'inventory', itemId), data);
  }

  async deleteItem(itemId: string): Promise<void> {
    await deleteDoc(doc(db, 'inventory', itemId));
  }

  async updateStock(itemId: string, quantity: number, operation: 'add' | 'subtract'): Promise<void> {
    const snap = await getDoc(doc(db, 'inventory', itemId));
    if (!snap.exists()) return;
    
    const current = snap.data().currentStock || 0;
    const newStock = operation === 'add' ? current + quantity : Math.max(0, current - quantity);
    
    await updateDoc(doc(db, 'inventory', itemId), {
      currentStock: newStock,
      lastUpdated: serverTimestamp()
    });
  }

  async getLowStockItems(): Promise<any[]> {
    const snap = await getDocs(collection(db, 'inventory'));
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((item: any) => item.currentStock <= item.minStock);
  }

  cleanup(): void {
    this.unsubscribers.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this.unsubscribers.clear();
  }
}

export const inventoryModule = new InventoryModule();
