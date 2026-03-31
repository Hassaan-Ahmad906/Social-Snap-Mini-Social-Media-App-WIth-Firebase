
import { db } from "../firebase";
import { ref, set, push } from "firebase/database";
import { updateProfile } from "firebase/auth";

const NAMES = [
  "Emma", "Liam", "Olivia", "Noah", "Ava", "William", "Sophia", "James", "Isabella", "Oliver",
  "Mia", "Benjamin", "Charlotte", "Elijah", "Amelia", "Lucas", "Harper", "Mason", "Evelyn", "Logan"
];

const LAST_NAMES = [
  "Smith", "Johnson", "Brown", "Williams", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"
];

function getRandomUser() {
  const firstName = NAMES[Math.floor(Math.random() * NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const displayName = `${firstName} ${lastName}`;
  const gender = Math.random() > 0.5 ? "men" : "women";
  const index = Math.floor(Math.random() * 99);
  const photoURL = `https://randomuser.me/api/portraits/${gender}/${index}.jpg`;
  
  return {
    displayName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}@example.com`,
    photoURL,
    bio: "📸 Just living life and capturing moments.",
    followers: Math.floor(Math.random() * 500),
    following: Math.floor(Math.random() * 300),
    postsCount: Math.floor(Math.random() * 50),
    createdAt: Date.now()
  };
}

export async function seedDatabase(count = 20) {
  console.log(`Starting seed of ${count} users...`);
  const usersRef = ref(db, "users");
  
  try {
    const promises = [];
    for (let i = 0; i < count; i++) {
        // We can't use push for users if we want to simulate auth UIDs, but for dummy data, push is fine 
        // OR we just generate random IDs.
        // However, since we can't write to other nodes due to rules, this might fail unless rules are open.
        // We will try to write to a 'users' node using push().
        
        // Note: Real app usually creates user on auth. Here we just dump data into DB.
        const newUserRef = push(usersRef); 
        promises.push(set(newUserRef, getRandomUser()));
    }
    
    await Promise.all(promises);
    console.log("Seeding complete!");
    alert(`Successfully added ${count} dummy users! Refresh to see them.`);
  } catch (error) {
    console.error("Seeding failed:", error);
    alert("Seeding failed! Check console. likely permission denied. Please allow public write access to 'users' temporarily in database.rules.json.");
  }
}
