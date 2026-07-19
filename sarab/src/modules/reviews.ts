/* ============================================================
   REVIEWS MODULE
   Customer reviews and ratings for orders and riders
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

export interface Review {
  id?: string;
  orderId: string;
  customerId: string;
  customerName: string;
  riderId?: string;
  rating: number;
  comment?: string;
  foodRating?: number;
  deliveryRating?: number;
  createdAt: Date;
}

export class ReviewsModule {
  async createReview(data: Omit<Review, 'id' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(collection(db, 'reviews'), {
      ...data,
      createdAt: serverTimestamp()
    });
    
    if (data.riderId) {
      await this._updateRiderRating(data.riderId);
    }
    
    return ref.id;
  }

  async getOrderReview(orderId: string): Promise<Review | null> {
    const q = query(collection(db, 'reviews'), where('orderId', '==', orderId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Review;
  }

  async getRiderReviews(riderId: string): Promise<Review[]> {
    const q = query(
      collection(db, 'reviews'),
      where('riderId', '==', riderId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Review[];
  }

  async getRiderAverageRating(riderId: string): Promise<number> {
    const reviews = await this.getRiderReviews(riderId);
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }

  private async _updateRiderRating(riderId: string): Promise<void> {
    const avg = await this.getRiderAverageRating(riderId);
    await updateDoc(doc(db, 'riders', riderId), { rating: avg });
  }
}

export const reviewsModule = new ReviewsModule();
