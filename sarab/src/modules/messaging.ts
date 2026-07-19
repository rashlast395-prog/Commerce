/* ============================================================
   MESSAGING MODULE
   Real-time messaging between users
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
  onSnapshot,
  serverTimestamp
} from '../../js/firebase-shared.js';

export interface Message {
  id?: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  receiverName: string;
  text: string;
  read: boolean;
  createdAt: Date;
}

export class MessagingModule {
  private unsubscribers: Map<string, () => void> = new Map();

  subscribeToConversation(userId1: string, userId2: string, callback: (messages: Message[]) => void): () => void {
    const q1 = query(
      collection(db, 'messages'),
      where('senderId', '==', userId1),
      where('receiverId', '==', userId2),
      orderBy('createdAt', 'asc')
    );
    const q2 = query(
      collection(db, 'messages'),
      where('senderId', '==', userId2),
      where('receiverId', '==', userId1),
      orderBy('createdAt', 'asc')
    );

    const unsub1 = onSnapshot(q1, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._mergeMessages(userId1, userId2, msgs, callback);
    });

    const unsub2 = onSnapshot(q2, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._mergeMessages(userId1, userId2, msgs, callback);
    });

    const key = `${userId1}-${userId2}`;
    this.unsubscribers.set(key, () => { unsub1(); unsub2(); });
    
    return () => {
      unsub1();
      unsub2();
      this.unsubscribers.delete(key);
    };
  }

  private _mergeMessages(uid1: string, uid2: string, newMsgs: any[], callback: (messages: Message[]) => void) {
    const key = `${uid1}-${uid2}`;
    const existing = this.unsubscribers.get(key);
    if (existing && existing._msgs) {
      const merged = [...existing._msgs, ...newMsgs];
      merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      existing._msgs = merged;
      callback(merged);
    }
  }

  async sendMessage(data: Omit<Message, 'id' | 'createdAt' | 'read'>): Promise<string> {
    const ref = await addDoc(collection(db, 'messages'), {
      ...data,
      read: false,
      createdAt: serverTimestamp()
    });
    return ref.id;
  }

  async markAsRead(messageId: string): Promise<void> {
    await updateDoc(doc(db, 'messages', messageId), { read: true });
  }

  async getConversations(userId: string): Promise<any[]> {
    const q1 = query(collection(db, 'messages'), where('senderId', '==', userId), orderBy('createdAt', 'desc'));
    const q2 = query(collection(db, 'messages'), where('receiverId', '==', userId), orderBy('createdAt', 'desc'));
    
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const all = [...snap1.docs, ...snap2.docs];
    
    const conversations = new Map();
    all.forEach(d => {
      const data = d.data();
      const otherId = data.senderId === userId ? data.receiverId : data.senderId;
      if (!conversations.has(otherId) || new Date(data.createdAt) > new Date(conversations.get(otherId).createdAt)) {
        conversations.set(otherId, { id: d.id, ...data });
      }
    });
    
    return Array.from(conversations.values());
  }

  cleanup(): void {
    this.unsubscribers.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this.unsubscribers.clear();
  }
}

export const messagingModule = new MessagingModule();
