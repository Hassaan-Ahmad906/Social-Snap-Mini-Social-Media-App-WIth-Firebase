// ============================================
// Seed Script — Create 50 Users & Content
// Run: node src/seedData.mjs
// ============================================

import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  signInWithEmailAndPassword
} from "firebase/auth";
import { getDatabase, ref, push, set, update, get } from "firebase/database";

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
const auth = getAuth(app);
const db = getDatabase(app);

// Data constants
const FIRST_NAMES = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa", "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley", "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle", "Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa", "Edward", "Deborah"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts"];

const BIOS = [
  "📸 Creating memories one snap at a time",
  "🌍 Travel enthusiast | ✈️ Wanderlust",
  "💻 Tech geek & code wizard",
  "🎨 Artist | 🖌️ Designer | ✨ Creative",
  "🎵 Music lover | 🎸 Guitarist",
  "💪 Fitness junkie | 🏋️‍♂️ Gym rat",
  "📚 Bookworm | ☕ Coffee addict",
  "🍕 Foodie | 🍔 Burger connoisseur",
  "🌱 Nature lover | 🌿 Plant parent",
  "🚀 Dreaming big | ✨ Stay positive",
  "🎮 Gamer | 🕹️ Level-up",
  "🎬 Movie buff | 🍿 Popcorn ready",
  "🧘‍♀️ Yoga & Mindfulness",
  "🏎️ Car enthusiast | 🏁 Race day",
  "🐶 Dog lover | 🐕 Best friend",
];

const POST_TEMPLATES = [
  "Just finished a great workout! 💪 #fitness #health",
  "Beautiful sunset today! 🌅 Nature is amazing.",
  "Coding all night long... 💻☕ #developer #insomnia",
  "Tried a new recipe today and it was delicious! 🍝😋 #foodie #cooking",
  "Can't believe it's already Friday! 🎉 Weekend vibes.",
  "Reading a fascinating book about history. 📚🧐 #reading #learning",
  "Traveling to new places is the best therapy. ✈️🌍 #travel #adventure",
  "Music is life. 🎵🎧 What are you listening to?",
  "Coffee first, everything else second. ☕😴 #coffee #morning",
  "Enjoying the little things in life. ✨😊 #gratitude",
  "New project coming soon! Stay tuned. 🚀👀",
  "Spending time with family is priceless. ❤️👨‍👩‍👧‍👦",
  "Just adopted a puppy! 🐶💕 meet Max!",
  "Reviewing some code... indentation matters! 🧐💻",
  "Movie marathon night! 🎬🍿 Recommendations?",
];

const COMMENT_TEMPLATES = [
  "Awesome! 🔥", "Love this! ❤️", "So true! 💯", "Great pic! 📸", 
  "Congrats! 🎉", "Wow! 😮", "Totally agree! 👍", "Have fun! 😊", 
  "Looks delicious! 😋", "Keep it up! 💪", "Beautiful! ✨", "Nice! 👌"
];

const BASE_AVATAR_URL = "https://api.dicebear.com/9.x/avataaars/svg?seed=";

async function seedData() {
  console.log("🌱 Starting generation of 50 users...");
  
  // Create 50 unique users
  const usersToCreate = [];
  const usedEmails = new Set();
  
  for (let i = 0; i < 50; i++) {
    const fn = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const ln = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const name = `${fn} ${ln}`;
    const cleanName = name.toLowerCase().replace(/[^a-z]/g, '');
    let email = `${cleanName}${i}@socialsnap.com`;
    
    // Ensure unique email
    let counter = 1;
    while (usedEmails.has(email)) {
      email = `${cleanName}${i}_${counter}@socialsnap.com`;
      counter++;
    }
    usedEmails.add(email);

    usersToCreate.push({
      displayName: name,
      email: email,
      password: "Test123456",
      bio: BIOS[Math.floor(Math.random() * BIOS.length)],
      photoURL: `${BASE_AVATAR_URL}${cleanName}${i}`,
    });
  }

  const createdUsers = [];

  // 1. Create Users in Auth & DB
  console.log("📝 Creating users in Firebase Auth...");
  for (const userData of usersToCreate) {
    try {
      // Small delay to prevent rate limiting
      await new Promise(r => setTimeout(r, 200)); 
      
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      const user = userCredential.user;
      
      await updateProfile(user, { 
        displayName: userData.displayName,
        photoURL: userData.photoURL
      });

      // Update DB
      const userRef = ref(db, `users/${user.uid}`);
      await set(userRef, {
        displayName: userData.displayName,
        email: userData.email,
        photoURL: userData.photoURL,
        bio: userData.bio,
        joinedAt: new Date().toISOString(),
        followersCount: 0,
        followingCount: 0
      });

      createdUsers.push({ uid: user.uid, ...userData });
      console.log(`   ✅ Created: ${userData.displayName}`);
      
      // Sign out to create next
      await signOut(auth);

    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        console.log(`   ⚠️ Already exists: ${userData.email}`);
        // Try to get UID if possible, but for seeding we skip logic complex recovery
        // Ideally we would login and get the UID
      } else {
        console.error(`   ❌ Failed: ${userData.email}`, err.message);
      }
    }
  }

  // 2. Generate content (Posts, Likes, Comments)
  console.log("\n📝 Generating posts and interactions...");
  
  // We need to write content. We can write directly to DB without being logged in as that user 
  // IF rules allow it or if we are using Admin SDK (which we aren't).
  // BUT, 'database.rules.json' often checks `auth.uid === ...`. 
  // For this client-side seed script to work with security rules, we might need to login as each user 
  // OR temporarily relax rules. 
  
  // Assumption: Rules might block writing as another user. 
  // WE WILL LOGIN as a random user to write 'public' data if rules allow, 
  // or cycle logins. To save time, we will try to write all posts using one "admin-like" session 
  // or just write directly if we are currently authenticated. 
  
  // Let's re-login as the first user to have SOME auth context
  if (createdUsers.length > 0) {
    await signInWithEmailAndPassword(auth, createdUsers[0].email, createdUsers[0].password);
  }

  const interactions = [];

  for (const user of createdUsers) {
    // Each user creates 0-3 posts
    const numPosts = Math.floor(Math.random() * 4); 
    
    for (let j = 0; j < numPosts; j++) {
      const postsRef = ref(db, "posts");
      const newPostRef = push(postsRef);
      const content = POST_TEMPLATES[Math.floor(Math.random() * POST_TEMPLATES.length)];
      const timeDelta = Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 7); // Up to 7 days ago
      
      const postData = {
        content: content,
        authorId: user.uid,
        authorName: user.displayName,
        authorEmail: user.email,
        authorPhoto: user.photoURL, // Store for easy access
        createdAt: Date.now() - timeDelta,
        likes: {},
        comments: {}
      };

      interactions.push(set(newPostRef, postData).then(async () => {
         // Add random likes
        const numLikes = Math.floor(Math.random() * 10);
        const likers = createdUsers.sort(() => 0.5 - Math.random()).slice(0, numLikes);
        
        for (const liker of likers) {
          await set(ref(db, `posts/${newPostRef.key}/likes/${liker.uid}`), true);
        }

        // Add random comments
        const numComments = Math.floor(Math.random() * 5);
        const commenters = createdUsers.sort(() => 0.5 - Math.random()).slice(0, numComments);
        
        for (const commenter of commenters) {
          const comRef = push(ref(db, `posts/${newPostRef.key}/comments`));
          await set(comRef, {
            text: COMMENT_TEMPLATES[Math.floor(Math.random() * COMMENT_TEMPLATES.length)],
            authorId: commenter.uid,
            authorName: commenter.displayName,
            createdAt: new Date(Date.now() - Math.random() * timeDelta).toISOString()
          });
        }
      }));
    }
  }

  await Promise.all(interactions);
  
  console.log("\n✅ Seeding Complete!");
  console.log(`   Generated ${createdUsers.length} users with posts/likes/comments.`);
  process.exit(0);
}

seedData();
