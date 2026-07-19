import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, getAuth } from 'firebase-admin/firestore';
import apiRoutes from './api/v1/index.js';
import healthRoutes from './api/v1/health.js';
import { initializeFirestore } from './services/firestore.js';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || true, credentials: true }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
  initializeApp({ credential: cert(sa), projectId: process.env.FIREBASE_PROJECT_ID });
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS), projectId: process.env.FIREBASE_PROJECT_ID });
}

const adminDb = getFirestore();
const adminAuth = getAuth();
initializeFirestore(adminDb);

app.use('/api/v1', apiRoutes);
app.use('/health', healthRoutes);

app.get('/', (req, res) => {
  res.json({ name: 'Richy\'s Eat API', version: '2.0.0', status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`[api] Richy's Eat API server listening on :${PORT}`);
});
