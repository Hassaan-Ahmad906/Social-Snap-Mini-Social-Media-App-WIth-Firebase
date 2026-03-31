// ============================================
// Test Script — Verify Realtime Database Connection
// Run this with: node src/testDb.mjs
// ============================================

import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyARM7L1LcP7dPV6dSZ9Ie2o7E9r9bYRoeM",
  authDomain: "social-snap-mini-social-app.firebaseapp.com",
  projectId: "social-snap-mini-social-app",
  storageBucket: "social-snap-mini-social-app.firebasestorage.app",
  messagingSenderId: "939280458300",
  appId: "1:939280458300:web:793d4644e064f58530d939",
  databaseURL: "https://social-snap-mini-social-app-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function testConnection() {
  console.log("🔄 Testing Realtime Database connection...\n");

  try {
    // Write test data
    const testRef = ref(db, "test/connection");
    await set(testRef, {
      message: "Hello from SocialSnap!",
      timestamp: new Date().toISOString(),
      status: "connected"
    });
    console.log("✅ SUCCESS! Data written to 'test/connection'");

    // Read it back
    const snapshot = await get(testRef);
    if (snapshot.exists()) {
      console.log("📄 Data read back:", snapshot.val());
      console.log("\n🎉 Realtime Database is connected and working!\n");
    } else {
      console.log("⚠️ Data was written but could not be read back.");
    }
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    console.log("\n💡 Make sure:");
    console.log("   1. Realtime Database is enabled in Firebase Console");
    console.log("   2. Database rules allow read/write");
    console.log("   3. databaseURL is correct in firebase.js\n");
  }

  process.exit(0);
}

testConnection();
