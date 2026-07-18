/* ============================================================
   MIGRATION SCRIPT — Phase 1: Database Architecture Cleanup
   ------------------------------------------------------------
   Migrates orders and reservations from user subcollections
   to top-level collections (single source of truth).

   Run once with:
     cd server
     node scripts/migrate-orders.js

   Or with Firebase service account:
     FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}' node scripts/migrate-orders.js
   ============================================================ */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, getDocs, doc, setDoc, getDoc, collection } from "firebase-admin/firestore";

async function main() {
  console.log("[migrate] Starting migration...");

  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    credential = cert(sa);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = cert(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  } else {
    console.error("[migrate] No credentials provided. Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS.");
    process.exit(1);
  }

  const app = initializeApp({ credential, projectId: process.env.FIREBASE_PROJECT_ID || "fire-c1a91" });
  const db = getFirestore(app);

  let ordersMigrated = 0;
  let reservationsMigrated = 0;
  let ordersSkipped = 0;
  let reservationsSkipped = 0;

  // Migrate orders from user subcollections to top-level
  console.log("[migrate] Scanning user order subcollections...");
  const usersSnapshot = await getDocs(collection(db, "users"));
  
  for (const userDoc of usersSnapshot.docs) {
    const uid = userDoc.id;
    const ordersSnapshot = await getDocs(collection(db, "users", uid, "orders"));
    
    for (const orderDoc of ordersSnapshot.docs) {
      const orderId = orderDoc.id;
      const data = orderDoc.data();
      
      // Check if top-level order already exists
      const topLevelRef = doc(db, "orders", orderId);
      const topLevelDoc = await getDoc(topLevelRef);
      
      if (topLevelDoc.exists()) {
        ordersSkipped++;
        continue;
      }
      
      // Ensure customerId is set
      const payload = { ...data, customerId: data.customerId || uid };
      
      await setDoc(topLevelRef, payload, { merge: true });
      ordersMigrated++;
      
      if (ordersMigrated % 100 === 0) {
        console.log(`[migrate] Migrated ${ordersMigrated} orders...`);
      }
    }
  }

  // Migrate reservations from user subcollections to top-level
  console.log("[migrate] Scanning user reservation subcollections...");
  
  for (const userDoc of usersSnapshot.docs) {
    const uid = userDoc.id;
    const reservationsSnapshot = await getDocs(collection(db, "users", uid, "reservations"));
    
    for (const resDoc of reservationsSnapshot.docs) {
      const resvId = resDoc.id;
      const data = resDoc.data();
      
      // Check if top-level reservation already exists
      const topLevelRef = doc(db, "reservations", resvId);
      const topLevelDoc = await getDoc(topLevelRef);
      
      if (topLevelDoc.exists()) {
        reservationsSkipped++;
        continue;
      }
      
      // Ensure customerId is set
      const payload = { ...data, customerId: data.customerId || uid };
      
      await setDoc(topLevelRef, payload, { merge: true });
      reservationsMigrated++;
      
      if (reservationsMigrated % 100 === 0) {
        console.log(`[migrate] Migrated ${reservationsMigrated} reservations...`);
      }
    }
  }

  console.log("\n[migrate] Migration complete!");
  console.log(`[migrate] Orders:      ${ordersMigrated} migrated, ${ordersSkipped} skipped`);
  console.log(`[migrate] Reservations: ${reservationsMigrated} migrated, ${reservationsSkipped} skipped`);
  console.log("[migrate] IMPORTANT: Verify data in Firebase Console before deleting subcollections.");
}

main().catch((err) => {
  console.error("[migrate] Fatal error:", err);
  process.exit(1);
});
