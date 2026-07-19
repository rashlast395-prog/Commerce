/* ============================================================
   PAYMENTS MODULE
   Payment processing, history, and refunds
   ============================================================ */

import {
  db,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from '../../js/firebase-shared.js';

export interface PaymentData {
  orderId: string;
  method: string;
  amount: number;
  currency?: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  provider?: string;
  transactionId?: string;
  phone?: string;
  cardLast4?: string;
  metadata?: Record<string, any>;
}

export class PaymentsModule {
  async createPayment(data: PaymentData): Promise<string> {
    const id = 'PAY-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const ref = doc(db, 'payments', id);
    const payload = {
      ...data,
      id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(ref, payload);
    return id;
  }

  async updatePaymentStatus(paymentId: string, status: string, transactionId?: string): Promise<void> {
    const ref = doc(db, 'payments', paymentId);
    const changes: any = { status, updatedAt: serverTimestamp() };
    if (transactionId) changes.transactionId = transactionId;
    await updateDoc(ref, changes);
  }

  async getPaymentHistory(orderId?: string, customerId?: string): Promise<any[]> {
    let q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
    
    if (orderId) {
      q = query(collection(db, 'payments'), where('orderId', '==', orderId), orderBy('createdAt', 'desc'));
    } else if (customerId) {
      const paymentsSnap = await getDocs(q);
      return paymentsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((p: any) => p.customerId === customerId);
    }
    
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async processRefund(paymentId: string, amount: number, reason: string): Promise<void> {
    await updateDoc(doc(db, 'payments', paymentId), {
      status: 'refunded',
      refundAmount: amount,
      refundReason: reason,
      refundedAt: serverTimestamp()
    });
  }
}

export const paymentsModule = new PaymentsModule();
