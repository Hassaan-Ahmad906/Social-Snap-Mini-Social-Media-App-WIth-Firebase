// Quick script to add photoURLs to existing seed users
// Run: node src/updatePhotos.mjs

import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, update } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyARM7L1LcP7dPV6dSZ9Ie2o7E9r9bYRoeM",
  authDomain: "social-snap-mini-social-app.firebaseapp.com",
  projectId: "social-snap-mini-social-app",
  storageBucket: "social-snap-mini-social-app.firebasestorage.app",
  messagingSenderId: "939280458300",
  appId: "1:939280458300:web:793d4644e064f58530d939",
  databaseURL: "https://social-snap-mini-social-app-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function updatePhotos() {
  console.log("📸 Updating user photos...\n");

  const usersRef = ref(db, "users");
  const snapshot = await get(usersRef);

  if (!snapshot.exists()) {
    console.log("No users found.");
    process.exit(0);
  }

  const users = snapshot.val();

  for (const [uid, user] of Object.entries(users)) {
    if (!user.photoURL) {
      const photoURL = `https://i.pravatar.cc/150?u=${encodeURIComponent(user.email || uid)}`;
      await update(ref(db, `users/${uid}`), { photoURL });
      console.log(`✅ Updated photo for ${user.displayName}: ${photoURL}`);
    } else {
      console.log(`⏭️  ${user.displayName} already has a photo`);
    }
  }

  console.log("\n🎉 All user photos updated!");
  process.exit(0);
}

updatePhotos();
