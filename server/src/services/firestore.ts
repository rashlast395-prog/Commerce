import { getFirestore, collection, doc, setDoc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, orderBy, serverTimestamp } from 'firebase-admin/firestore';

let db: any = null;

export function initializeFirestore(adminDb: any) {
  db = adminDb;
}

export function getDb() {
  if (!db) throw new Error('Firestore not initialized');
  return db;
}

export async function createOrder(orderData: any) {
  const db = getDb();
  const id = orderData.id || ('ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
  const ref = doc(db, 'orders', id);
  const payload = {
    ...orderData,
    id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await setDoc(ref, payload, { merge: true });
  return { id, ...payload };
}

export async function getOrder(orderId: string) {
  const db = getDb();
  const snap = await getDoc(doc(db, 'orders', orderId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function updateOrder(orderId: string, changes: any) {
  const db = getDb();
  const ref = doc(db, 'orders', orderId);
  await updateDoc(ref, { ...changes, updatedAt: serverTimestamp() });
  return getOrder(orderId);
}

export async function listOrders(filters?: any) {
  const db = getDb();
  let q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));

  if (filters?.status) {
    q = query(collection(db, 'orders'), where('status', '==', filters.status), orderBy('createdAt', 'desc'));
  }
  if (filters?.customerId) {
    q = query(collection(db, 'orders'), where('customerId', '==', filters.customerId), orderBy('createdAt', 'desc'));
  }
  if (filters?.riderId) {
    q = query(collection(db, 'orders'), where('riderId', '==', filters.riderId), orderBy('createdAt', 'desc'));
  }

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createMenuItem(itemData: any) {
  const db = getDb();
  const ref = await addDoc(collection(db, 'menu'), {
    ...itemData,
    createdAt: serverTimestamp()
  });
  return { id: ref.id, ...itemData };
}

export async function listMenuItems() {
  const db = getDb();
  const snap = await getDocs(query(collection(db, 'menu'), orderBy('name', 'asc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createReservation(data: any) {
  const db = getDb();
  const id = data.id || ('RES-' + Date.now());
  const ref = doc(db, 'reservations', id);
  await setDoc(ref, {
    ...data,
    id,
    createdAt: serverTimestamp()
  });
  return { id, ...data };
}

export async function listReservations() {
  const db = getDb();
  const snap = await getDocs(query(collection(db, 'reservations'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createRider(data: any) {
  const db = getDb();
  const ref = await addDoc(collection(db, 'riders'), {
    ...data,
    available: false,
    createdAt: serverTimestamp()
  });
  return { id: ref.id, ...data };
}

export async function listRiders() {
  const db = getDb();
  const snap = await getDocs(query(collection(db, 'riders'), orderBy('name', 'asc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function listUsers() {
  const db = getDb();
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function listContactMessages() {
  const db = getDb();
  const snap = await getDocs(query(collection(db, 'contactMessages'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
