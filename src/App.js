// ============================================
// App.js — Central Firebase Operations File
// ============================================
// Uses Firebase REALTIME DATABASE (not Firestore)
// COMPLETE FEATURE SET:
// - Authentication (signup, login, logout, Google, forgot password)
// - Posts (create, delete, real-time listener)
// - Likes (toggle like/unlike)
// - Comments (add, delete)
// - User Profiles (with caching for speed)
// - Follow System (follow/unfollow, followers/following lists)
// - Real-Time Chat (1-to-1 messaging)
// - Notifications (likes, comments, follows)
// - Online Presence (online status indicator)
// - Analytics (profile views, engagement)
// - Saved/Bookmarked Posts
// ============================================

import { auth, db, googleProvider } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  ref,
  push,
  set,
  remove,
  update,
  onValue,
  get,
  serverTimestamp,
  query,
  orderByChild,
  equalTo,
  limitToFirst,
  limitToLast,
  onDisconnect,
  off,
  runTransaction,
} from "firebase/database";

// ============================================
// USER PROFILE CACHE (in-memory for speed)
// ============================================
const _profileCache = {};

export function getCachedProfile(userId) {
  return _profileCache[userId] || null;
}

export async function ensureProfileLoaded(userId) {
  if (_profileCache[userId]) return _profileCache[userId];
  const profile = await getUserProfile(userId);
  if (profile) _profileCache[userId] = profile;
  return profile;
}

const _profilePromises = {};

export async function prefetchProfiles(userIds) {
  const toFetch = [...new Set(userIds)].filter(id => !_profileCache[id] && !_profilePromises[id]);
  if (toFetch.length === 0) return;

  const newPromises = toFetch.map(async (uid) => {
    _profilePromises[uid] = getUserProfile(uid).finally(() => {
       delete _profilePromises[uid];
    });
    const profile = await _profilePromises[uid];
    if (profile) _profileCache[uid] = profile;
  });

  await Promise.all(newPromises);
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

export async function signupUser(email, password, displayName) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(userCredential.user, { displayName: displayName.trim() });

  const userRef = ref(db, `users/${userCredential.user.uid}`);
  const userData = {
    displayName: displayName.trim(),
    email: email,
    photoURL: null,
    bio: "📸 SocialSnap user",
    joinedAt: new Date().toISOString(),
    followersCount: 0,
    followingCount: 0,
  };
  
  // Create DB entry in background (don't await) to prevent UI hang
  set(userRef, userData).catch(err => 
    console.error("Failed to create user DB entry:", err)
  );

  _profileCache[userCredential.user.uid] = { uid: userCredential.user.uid, ...userData };

  return userCredential.user;
}

export async function googleSignIn() {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  const userRef = ref(db, `users/${user.uid}`);
  const snapshot = await get(userRef);
  if (!snapshot.exists()) {
    const userData = {
      displayName: user.displayName || "Google User",
      email: user.email,
      photoURL: user.photoURL || null,
      bio: "📸 SocialSnap user",
      joinedAt: new Date().toISOString(),
      followersCount: 0,
      followingCount: 0,
    };
    await set(userRef, userData);
    _profileCache[user.uid] = { uid: user.uid, ...userData };
  } else {
    _profileCache[user.uid] = { uid: user.uid, ...snapshot.val() };
  }
  return user;
}

export async function loginUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function logoutUser() {
  // Set offline before logout - Fire and forget (don't await) to prevent hanging
  try {
    const user = auth.currentUser;
    if (user) {
      const presenceRef = ref(db, `presence/${user.uid}`);
      set(presenceRef, { online: false, lastSeen: Date.now() }).catch(err => 
        console.warn("Failed to set offline status:", err)
      );
    }
  } catch (err) {
    console.error("Error in logoutUser:", err);
  }
  return await signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

// Forgot Password
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ============================================
// ONLINE PRESENCE
// ============================================

export function setupPresence(userId) {
  const presenceRef = ref(db, `presence/${userId}`);
  const connectedRef = ref(db, ".info/connected");

  const unsubscribe = onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      set(presenceRef, { online: true, lastSeen: Date.now() });
      onDisconnect(presenceRef).set({ online: false, lastSeen: Date.now() });
    }
  });

  return () => {
    off(connectedRef);
    set(presenceRef, { online: false, lastSeen: Date.now() });
  };
}

export function listenToPresence(userId, callback) {
  const presenceRef = ref(db, `presence/${userId}`);
  const unsubscribe = onValue(presenceRef, (snap) => {
    callback(snap.val() || { online: false, lastSeen: null });
  });
  return () => unsubscribe();
}

// ============================================
// USER PROFILE FUNCTIONS
// ============================================

export async function getUserProfile(userId) {
  if (_profileCache[userId]) return _profileCache[userId];
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  if (snapshot.exists()) {
    const profile = { uid: userId, ...snapshot.val() };
    // default counts
    profile.postsCount = profile.postsCount || 0;
    profile.followersCount = profile.followersCount || 0;
    profile.followingCount = profile.followingCount || 0;
    profile.totalLikes = profile.totalLikes || 0;
    _profileCache[userId] = profile;
    return profile;
  }
  return null;
}

export function listenToUserProfile(userId, callback) {
  if (!userId) { callback(null); return () => {}; }
  if (_profileCache[userId]) {
    callback(_profileCache[userId]);
  }
  const userRef = ref(db, `users/${userId}`);
  const unsubscribe = onValue(userRef, (snapshot) => {
    try {
      if (snapshot.exists()) {
        const profile = { uid: userId, ...snapshot.val() };
        // defaults for new count fields
        profile.postsCount = profile.postsCount || 0;
        profile.followersCount = profile.followersCount || 0;
        profile.followingCount = profile.followingCount || 0;
        profile.totalLikes = profile.totalLikes || 0;
        _profileCache[userId] = profile;
        callback(profile);
      } else {
        callback(null);
      }
    } catch (err) {
      console.error("Error in listenToUserProfile:", err);
      callback(null);
    }
  }, (error) => {
    console.error("Firebase listenToUserProfile error:", error);
    callback(null);
  });
  return () => unsubscribe();
}

export async function updateUserProfile(userId, updates) {
  const userRef = ref(db, `users/${userId}`);
  const cleanUpdates = {};
  for (const key in updates) {
    cleanUpdates[key] = updates[key] === undefined ? null : updates[key];
  }
  await update(userRef, cleanUpdates);

  if (_profileCache[userId]) {
    _profileCache[userId] = { ..._profileCache[userId], ...cleanUpdates };
  }

  const user = auth.currentUser;
  if (user && user.uid === userId) {
    const authUpdates = {};
    if (cleanUpdates.displayName) authUpdates.displayName = cleanUpdates.displayName;
    if (cleanUpdates.photoURL && !cleanUpdates.photoURL.startsWith("data:")) {
      authUpdates.photoURL = cleanUpdates.photoURL;
    }
    if (Object.keys(authUpdates).length > 0) {
      await updateProfile(user, authUpdates);
    }
  }
}

export function listenToUsers(callback) {
  const usersRef = ref(db, "users");
  const unsubscribe = onValue(usersRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) { callback([]); return; }
    const users = Object.entries(data).map(([uid, user]) => {
      const profile = { uid, ...user };
      _profileCache[uid] = profile;
      return profile;
    });
    callback(users);
  });
  return () => unsubscribe();
}

// In-memory users cache to avoid repeated full fetches
let _usersListCache = null;

// One-time users fetch (faster than a live listener for search / explore)
export async function getUsersOnce(limit = 500) {
  // If we already have a cache, slice it instead of hitting the network again
  if (_usersListCache && Array.isArray(_usersListCache) && _usersListCache.length > 0) {
    return limit ? _usersListCache.slice(0, limit) : _usersListCache;
  }

  const usersRef = limit ? query(ref(db, "users"), limitToFirst(limit)) : ref(db, "users");
  const snapshot = await get(usersRef);
  if (!snapshot.exists()) {
    _usersListCache = [];
    return [];
  }
  const data = snapshot.val();
  const users = Object.entries(data).map(([uid, user]) => {
    const profile = { uid, ...user };
    _profileCache[uid] = profile;
    return profile;
  });
  _usersListCache = users;
  return users;
}

export async function searchUsers(searchQuery) {
  const allUsers = await getUsersOnce(); // uses in-memory cache after first load
  const q = searchQuery.toLowerCase();
  return allUsers.filter(
    (u) =>
      u.displayName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
  );
}

// ============================================
// FOLLOW SYSTEM
// ============================================

export async function followUser(currentUserId, targetUserId) {
  const updates = {};
  updates[`following/${currentUserId}/${targetUserId}`] = true;
  updates[`followers/${targetUserId}/${currentUserId}`] = true;
  
  // Update relationship nodes
  update(ref(db), updates).catch(err => console.error("Follow DB update failed:", err));
  
  // Atomic updates for counts using transactions (safe check to avoid drift)
  const performCountUpdate = async () => {
    try {
      const [followingSnap, followersSnap] = await Promise.all([
        get(ref(db, `following/${currentUserId}`)),
        get(ref(db, `followers/${targetUserId}`)),
      ]);
      
      const followingCount = followingSnap.exists() ? Object.keys(followingSnap.val()).length : 0;
      const followersCount = followersSnap.exists() ? Object.keys(followersSnap.val()).length : 0;

      await update(ref(db, `users/${currentUserId}`), { followingCount });
      await update(ref(db, `users/${targetUserId}`), { followersCount });
      
      // Update local cache for immediate feedback elsewhere
      if (_profileCache[currentUserId]) _profileCache[currentUserId].followingCount = followingCount;
      if (_profileCache[targetUserId]) _profileCache[targetUserId].followersCount = followersCount;
    } catch (err) {
      console.error("Delayed count update failed:", err);
    }
  };

  // Run re-count in background after a short delay to ensure DB propagation
  setTimeout(performCountUpdate, 1000);

  // Create follow notification
  const notifRef = push(ref(db, `notifications/${targetUserId}`));
  set(notifRef, {
    type: "follow",
    fromUserId: currentUserId,
    timestamp: Date.now(),
    read: false,
  }).catch(err => console.error("Follow notification failed:", err));
}

export async function unfollowUser(currentUserId, targetUserId) {
  const updates = {};
  updates[`following/${currentUserId}/${targetUserId}`] = null;
  updates[`followers/${targetUserId}/${currentUserId}`] = null;
  
  // Update relationship nodes
  update(ref(db), updates).catch(err => console.error("Unfollow DB update failed:", err));
  
  // Run re-count in background
  const performCountUpdate = async () => {
    try {
      const [followingSnap, followersSnap] = await Promise.all([
        get(ref(db, `following/${currentUserId}`)),
        get(ref(db, `followers/${targetUserId}`)),
      ]);
      const followingCount = followingSnap.exists() ? Object.keys(followingSnap.val()).length : 0;
      const followersCount = followersSnap.exists() ? Object.keys(followersSnap.val()).length : 0;

      await update(ref(db, `users/${currentUserId}`), { followingCount });
      await update(ref(db, `users/${targetUserId}`), { followersCount });
      
      if (_profileCache[currentUserId]) _profileCache[currentUserId].followingCount = followingCount;
      if (_profileCache[targetUserId]) _profileCache[targetUserId].followersCount = followersCount;
    } catch (err) {
      console.error("Delayed unfollow count update failed:", err);
    }
  };

  setTimeout(performCountUpdate, 1000);
}

export function listenToIsFollowing(currentUserId, targetUserId, callback) {
  if (!currentUserId || !targetUserId) { callback(false); return () => {}; }
  const followRef = ref(db, `following/${currentUserId}/${targetUserId}`);
  const unsubscribe = onValue(followRef, (snap) => {
    callback(snap.exists());
  }, (err) => {
    console.error("Firebase listenToIsFollowing error:", err);
    callback(false);
  });
  return () => unsubscribe();
}

export function listenToFollowers(userId, callback) {
  if (!userId) { callback([]); return () => {}; }
  const followersRef = ref(db, `followers/${userId}`);
  const unsubscribe = onValue(followersRef, async (snap) => {
    try {
      if (!snap.exists()) { callback([]); return; }
      const ids = Object.keys(snap.val());
      await prefetchProfiles(ids);
      const profiles = ids.map(id => getCachedProfile(id) || { uid: id, displayName: "User", photoURL: null });
      callback(profiles);
    } catch (err) {
      console.error("Error in listenToFollowers:", err);
      callback([]);
    }
  }, (err) => {
    console.error("Firebase listenToFollowers error:", err);
    callback([]);
  });
  return () => unsubscribe();
}

export function listenToFollowing(userId, callback) {
  if (!userId) { callback([]); return () => {}; }
  const followingRef = ref(db, `following/${userId}`);
  const unsubscribe = onValue(followingRef, async (snap) => {
    try {
      if (!snap.exists()) { callback([]); return; }
      const ids = Object.keys(snap.val());
      await prefetchProfiles(ids);
      const profiles = ids.map(id => getCachedProfile(id) || { uid: id, displayName: "User", photoURL: null });
      callback(profiles);
    } catch (err) {
      console.error("Error in listenToFollowing:", err);
      callback([]);
    }
  }, (err) => {
    console.error("Firebase listenToFollowing error:", err);
    callback([]);
  });
  return () => unsubscribe();
}

// ============================================
// AVATAR URL HELPER
// ============================================

export function getAvatarUrl(user) {
  if (!user) return null;
  if (user.photoURL) return user.photoURL;
  return null;
}

// ============================================
// POST FUNCTIONS
// ============================================

let _postsCache = [];

// Listeners management for optimistic updates
const _postListeners = new Set();

export function getPostsCache() {
  return _postsCache;
}

const _userPostsCache = {}; // Cache for user-specific posts
const _notificationsCache = {}; // Cache for notifications

export function getUserPostsCache(userId) {
  return _userPostsCache[userId];
}

export function getNotificationsCache(userId) {
  return _notificationsCache[userId];
}

export async function prefetchUserPosts(userId) {
  if (!userId) return;
  return prefetchProfiles([userId]);
}

export async function createPost(content, imageUrl) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const postsRef = ref(db, "posts");
  const newPostRef = push(postsRef);

  const postData = {
    content: (content || "").trim(),
    authorId: user.uid,
    authorName: user.displayName || "Anonymous",
    authorEmail: user.email,
    imageUrl: imageUrl || null,
    likes: [],
    comments: [],
    createdAt: Date.now(),
    id: newPostRef.key, // Optimistic ID
  };

  // 1. Optimistic Cache Update
  _postsCache = [postData, ..._postsCache];
  _userPostsCache[user.uid] = [postData, ...(_userPostsCache[user.uid] || [])];

  // increment postsCount in profile (optimistic)
  const postsCountRef = ref(db, `users/${user.uid}/postsCount`);
  // use transaction to ensure atomic update
  runTransaction(postsCountRef, (current) => (current || 0) + 1).catch(err => console.error("Increment postsCount failed:", err));
  if (_profileCache[user.uid]) {
    _profileCache[user.uid].postsCount = (_profileCache[user.uid].postsCount || 0) + 1;
  }

  // 2. Notify Listeners Immediately
  _postListeners.forEach(listener => listener(_postsCache));

  // 3. Fire Network Request (Background)
  set(newPostRef, postData).catch(err => {
    console.error("Create post failed:", err);
    // Rollback could go here (remove from cache and notify), but simplified for now
  });
  
  return newPostRef.key;
}

export async function deletePost(postId) {
  const postRef = ref(db, `posts/${postId}`);
  // decrement posts count (if possible we'll use transaction to avoid negative values)
  try {
    const snapshot = await get(postRef);
    if (snapshot.exists()) {
      const authorId = snapshot.val().authorId;
      if (authorId) {
        const postsCountRef = ref(db, `users/${authorId}/postsCount`);
        runTransaction(postsCountRef, (current) => {
          const newVal = (current || 1) - 1;
          return newVal < 0 ? 0 : newVal;
        }).catch(err => console.error("Decrement postsCount failed:", err));
        if (_profileCache[authorId]) {
          _profileCache[authorId].postsCount = Math.max(0, (_profileCache[authorId].postsCount || 1) - 1);
        }
      }
    }
  } catch (err) {
    console.error("Error fetching post for delete", err);
  }
  remove(postRef).catch(err => console.error("Delete post failed:", err));
}

export function listenToPosts(callback) {
  // Register listener for optimistic updates
  _postListeners.add(callback);

  const postsRef = query(ref(db, "posts"), limitToLast(50));
  
  // Return cached data immediately
  if (_postsCache && _postsCache.length > 0) {
    try {
      callback(_postsCache);
    } catch (err) {
      console.error("Error callback:", err);
    }
  }

  const unsubscribe = onValue(postsRef, (snapshot) => {
    try {
      const data = snapshot.val();
      // If no data, but we have cache (e.g. optimistic), maybe keep cache? 
      // But real source of truth says empty. 
      // If we just posted optimistically, Firebase usually fires local event quickly too.
      // We will trust Firebase update, merging/overwriting our optimistic one effectively 
      // (since optimistic one is in DB now or will be).
      
      if (!data) { 
        if (_postsCache.length === 0) callback([]); 
        return; 
      }

      const posts = Object.entries(data)
        .map(([id, post]) => ({
          id, ...post,
          likes: post.likes ? Object.keys(post.likes) : [],
          comments: post.comments
            ? Object.entries(post.comments).map(([commentId, comment]) => ({ id: commentId, ...comment }))
            : [],
        }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      const authorIds = [...new Set(posts.map(p => p.authorId))].filter(Boolean);
      prefetchProfiles(authorIds); // Background
      _postsCache = posts;
      callback(posts);
    } catch (err) {
      console.error("Error in listenToPosts:", err);
    }
  }, (error) => {
    console.error("Firebase listenToPosts error:", error);
  });
  
  return () => {
    _postListeners.delete(callback);
    unsubscribe();
  };
}

export function listenToUserPosts(userId, callback) {
  if (!userId) { callback([]); return () => {}; }
  
  // Return cached data immediately if available
  if (_userPostsCache[userId]) {
    callback(_userPostsCache[userId]);
  }

  const postsRef = query(ref(db, "posts"), orderByChild("authorId"), equalTo(userId), limitToLast(50));
  const unsubscribe = onValue(postsRef, (snapshot) => {
    try {
      const data = snapshot.val();
      if (!data) { 
        _userPostsCache[userId] = [];
        callback([]); 
        return; 
      }

      const posts = Object.entries(data)
        .map(([id, post]) => ({
          id, ...post,
          likes: post.likes ? Object.keys(post.likes) : [],
          comments: post.comments
            ? Object.entries(post.comments).map(([cid, c]) => ({ id: cid, ...c }))
            : [],
        }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      _userPostsCache[userId] = posts; // Update cache
      callback(posts);
    } catch (err) {
      console.error("Error in listenToUserPosts:", err);
      // Don't clear cache on error, just return empty or keep old data?
      // Better to return empty if we really failed, or just do nothing.
      // For now, safety callback([])
      callback([]);
    }
  }, (error) => {
    console.error("Firebase listenToUserPosts error:", error);
    callback([]);
  });
  return () => unsubscribe();
}

// Listen to posts liked by a specific user (efficiently)
export function listenToLikedPosts(userId, callback) {
  if (!userId) { callback([]); return () => {}; }

  const likesRef = ref(db, `users/${userId}/likes`);
  const unsubscribe = onValue(likesRef, async (snapshot) => {
    try {
      if (!snapshot.exists()) { callback([]); return; }
      
      const likedPostIds = Object.keys(snapshot.val());
      if (likedPostIds.length === 0) { callback([]); return; }

      // Fetch the actual posts
      // We could use get() for each, but we might want to listen to them if we want real-time updates on those posts?
      // For "Liked" tab, it's usually okay to just fetch once or re-fetch on mount.
      // But listenToPosts is real-time.
      // Constructing a real-time listener for a dynamic list of IDs is hard in Firebase.
      // Best approach: Fetch them once, and since we have a global posts listener elsewhere usually, maybe rely on that?
      // Or just fetch them. The Profile component will re-fetch if this callback fires (which happens when user likes/unlikes something).
      
      const promises = likedPostIds.map(id => get(ref(db, `posts/${id}`)));
      const snapshots = await Promise.all(promises);
      
      const likedPosts = snapshots
        .map((snap, index) => {
          if (!snap.exists()) return null;
          const post = snap.val();
          return {
            id: likedPostIds[index],
            ...post,
             likes: post.likes ? Object.keys(post.likes) : [],
             comments: post.comments
               ? Object.entries(post.comments).map(([cid, c]) => ({ id: cid, ...c }))
               : [],
          };
        })
        .filter(p => p !== null)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      // Prefetch authors
      const authorIds = [...new Set(likedPosts.map(p => p.authorId))].filter(Boolean);
      prefetchProfiles(authorIds); // Background

      callback(likedPosts);
    } catch (err) {
      console.error("Error in listenToLikedPosts:", err);
      callback([]);
    }
  });

  return () => unsubscribe();
}

// ============================================
// BOOKMARK / SAVE FUNCTIONS
// ============================================

export async function savePost(userId, postId) {
  const savedRef = ref(db, `users/${userId}/saved/${postId}`);
  await set(savedRef, true);
}

export async function unsavePost(userId, postId) {
  const savedRef = ref(db, `users/${userId}/saved/${postId}`);
  await remove(savedRef);
}

export function listenToSavedPosts(userId, callback) {
  if (!userId) { callback([]); return () => {}; }
  const savedRef = ref(db, `users/${userId}/saved`);

  const unsubscribe = onValue(savedRef, async (savedSnap) => {
    try {
      const savedIds = savedSnap.val() ? Object.keys(savedSnap.val()) : [];
      if (savedIds.length === 0) { callback([]); return; }

      // Fetch each post individually
      const promises = savedIds.map(id => get(ref(db, `posts/${id}`)));
      const snapshots = await Promise.all(promises);
      
      const savedPosts = snapshots
        .map((snap, index) => {
          if (!snap.exists()) return null;
          const post = snap.val();
          return {
            id: savedIds[index], // or snap.key
            ...post,
            likes: post.likes ? Object.keys(post.likes) : [],
            comments: post.comments
              ? Object.entries(post.comments).map(([cid, c]) => ({ id: cid, ...c }))
              : [],
          };
        })
        .filter(p => p !== null)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      // Prefetch authors
      const authorIds = [...new Set(savedPosts.map(p => p.authorId))].filter(Boolean);
      prefetchProfiles(authorIds); // Background

      callback(savedPosts);
    } catch (err) {
      console.error("Error in listenToSavedPosts:", err);
      callback([]);
    }
  });
  return () => unsubscribe();
}

export function listenToIsSaved(userId, postId, callback) {
  const savedRef = ref(db, `users/${userId}/saved/${postId}`);
  const unsubscribe = onValue(savedRef, (snapshot) => { callback(snapshot.exists()); });
  return () => unsubscribe();
}

// ============================================
// LIKE FUNCTIONS
// ============================================

// Helper to push notification
async function pushNotification(toUserId, type, data) {
  if (!toUserId || toUserId === auth.currentUser?.uid) return;
  const notifRef = push(ref(db, `notifications/${toUserId}`));
  await set(notifRef, {
    type,
    ...data,
    timestamp: Date.now(),
    read: false,
    fromUserId: auth.currentUser.uid,
  });
}

export async function likePost(postId, userId, postAuthorId, postContent) {
  const likeRef = ref(db, `posts/${postId}/likes/${userId}`);
  
  // Fire and forget
  set(likeRef, true).catch(err => console.error("Like failed:", err));
  
  if (postAuthorId) {
    pushNotification(postAuthorId, "like", {
      postId,
      postContent: (postContent || "").substring(0, 50),
    }).catch(err => console.error("Notif failed:", err));

    // increment the author's totalLikes counter
    const totalLikesRef = ref(db, `users/${postAuthorId}/totalLikes`);
    runTransaction(totalLikesRef, (cur) => (cur || 0) + 1).catch(err => console.error("Increment totalLikes failed:", err));
    
    // Update cache
    if (_profileCache[postAuthorId]) {
      _profileCache[postAuthorId].totalLikes = (_profileCache[postAuthorId].totalLikes || 0) + 1;
    }
  }

  // Also track under users/{userId}/likes for efficient querying
  set(ref(db, `users/${userId}/likes/${postId}`), true).catch(err => console.error("Like track failed:", err));
}

export async function unlikePost(postId, userId, authorId) {
  const likeRef = ref(db, `posts/${postId}/likes/${userId}`);
  
  // Fire and forget
  remove(likeRef).catch(err => console.error("Unlike failed:", err));
  
  // Remove from users/{userId}/likes
  remove(ref(db, `users/${userId}/likes/${postId}`)).catch(err => console.error("Unlike track failed:", err));

  if (authorId) {
    const totalLikesRef = ref(db, `users/${authorId}/totalLikes`);
    runTransaction(totalLikesRef, (cur) => {
      const newVal = (cur || 1) - 1;
      return newVal < 0 ? 0 : newVal;
    }).catch(err => console.error("Decrement totalLikes failed:", err));
    if (_profileCache[authorId]) {
      _profileCache[authorId].totalLikes = Math.max(0, (_profileCache[authorId].totalLikes || 1) - 1);
    }
  }
}

// ============================================
// COMMENT FUNCTIONS
// ============================================

export async function addComment(postId, commentText) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const commentsRef = ref(db, `posts/${postId}/comments`);
  const newCommentRef = push(commentsRef);

  const comment = {
    text: commentText.trim(),
    authorId: user.uid,
    authorName: user.displayName || "Anonymous",
    createdAt: new Date().toISOString(),
  };

  await set(newCommentRef, comment);
  
  // We need to fetch the post to get authorId if not passed, but better to pass it.
  // For now, let's assume the UI passes it or we fetch it.
  // To avoid breaking existing calls, we'll try to fetch post owner if possible or rely on arguments.
  // Actually, let's just update the signature in the component.
  // But to be safe, let's fetch the post quickly or just skip if we don't have it.
  
  // NOTE: The caller should pass postAuthorId for performance.
  // If not, we skip notification for now or fetch it.
  // Let's modify the signature to addComment(postId, commentText, postAuthorId)
  
  return { id: newCommentRef.key, ...comment };
}

export async function addCommentWithNotification(postId, commentText, postAuthorId, postContent) {
   const res = await addComment(postId, commentText); // Reuse existing
   if (postAuthorId) {
     await pushNotification(postAuthorId, "comment", {
       postId,
       commentText: commentText.substring(0, 50),
       postContent: (postContent || "").substring(0, 50),
     });
   }
   return res;
}

export async function deleteComment(postId, commentId) {
  const commentRef = ref(db, `posts/${postId}/comments/${commentId}`);
  await remove(commentRef);
}

// ============================================
// NOTIFICATION FUNCTIONS (Enhanced)
// ============================================

export function listenToNotifications(userId, callback) {
  if (!userId) { callback([]); return () => {}; }

  // Return cached notifications immediately
  if (_notificationsCache[userId]) {
    callback(_notificationsCache[userId]);
  }

  const notifRef = query(ref(db, `notifications/${userId}`), limitToLast(50));

  const unsubscribe = onValue(notifRef, async (snap) => {
    try {
      if (!snap.exists()) { callback([]); return; }
      
      const data = snap.val();
      // Convert to array and sort desc
      let notifs = Object.entries(data)
        .map(([id, n]) => ({ id, ...n }))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      // Prefetch profiles
      const senderIds = [...new Set(notifs.map(n => n.fromUserId))].filter(Boolean);
      prefetchProfiles(senderIds); // Background
      
      // Attach names
      notifs = notifs.map(n => {
        const profile = getCachedProfile(n.fromUserId);
        return {
          ...n,
          fromUserName: profile?.displayName || n.fromUserName || "Someone",
          fromUserProfile: profile || { uid: n.fromUserId, displayName: n.fromUserName || "Someone", photoURL: null } // Fallback
        };
      });

      callback(notifs);
      _notificationsCache[userId] = notifs; // Update cache
    } catch (err) {
      console.error("Error in listenToNotifications:", err);
      // callback([]); // Don't wipe data on error if we have cache?
      // For now stick to standard error handling
      callback([]);
    }
  });

  return () => unsubscribe();
}

// ============================================
// REAL-TIME CHAT FUNCTIONS
// ============================================

function getChatId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

// In-memory messages cache per chat for faster reopen
const _messagesCache = {};

export function getCachedMessages(userId1, userId2) {
  const chatId = getChatId(userId1, userId2);
  if (_messagesCache[chatId]) return _messagesCache[chatId];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(`chatMessages_${chatId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          _messagesCache[chatId] = parsed;
          return parsed;
        }
      }
    } catch {
      // ignore bad cache
    }
  }
  return [];
}

export async function sendMessage(fromUserId, toUserId, text) {
  const chatId = getChatId(fromUserId, toUserId);
  const messagesRef = ref(db, `chats/${chatId}/messages`);
  const newMsgRef = push(messagesRef);

  const message = {
    senderId: fromUserId,
    text: text.trim(),
    timestamp: Date.now(),
    read: false,
  };

  await set(newMsgRef, message);

  // Update chat metadata for both users
  const chatMeta = {
    lastMessage: text.trim().substring(0, 50),
    lastMessageTime: Date.now(),
    lastSenderId: fromUserId,
  };
  await update(ref(db, `userChats/${fromUserId}/${toUserId}`), chatMeta);
  await update(ref(db, `userChats/${toUserId}/${fromUserId}`), chatMeta);

  return newMsgRef.key;
}

export function listenToMessages(userId1, userId2, callback) {
  const chatId = getChatId(userId1, userId2);
  const messagesRef = ref(db, `chats/${chatId}/messages`);

  // Only keep the newest messages for faster loads
  // Push IDs are chronological, so limitToLast works natively without index
  const messagesQuery = query(messagesRef, limitToLast(50));

  function toLimitedMessages(snap) {
    if (!snap || !snap.exists()) return [];
    const data = snap.val();
    return Object.entries(data)
      .map(([id, msg]) => ({ id, ...msg }))
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }

  function cacheAndCallback(msgs) {
    _messagesCache[chatId] = msgs;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`chatMessages_${chatId}`, JSON.stringify(msgs));
      } catch {
        // ignore storage quota errors
      }
    }
    callback(msgs);
  }

  // 1) One-time fetch so UI doesn't get stuck loading
  get(messagesQuery)
    .then((snap) => {
      if (snap.exists()) {
        cacheAndCallback(toLimitedMessages(snap));
      } else {
        callback([]); // Empty chat
      }
    })
    .catch((err) => {
      console.error("Firebase get messages error:", err);
      // callback([]); // Keep loading or empty?
    });

  // 2) Real-time listener for live updates
  const unsubscribe = onValue(
    messagesQuery,
    (snap) => {
      cacheAndCallback(toLimitedMessages(snap));
    },
    (err) => {
      console.error("Firebase listenToMessages error:", err);
      callback([]);
    }
  );

  return () => unsubscribe();
}

export function listenToChatList(userId, callback) {
  const chatsRef = ref(db, `userChats/${userId}`);
  const unsubscribe = onValue(chatsRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const data = snap.val();
    const chatUserIds = Object.keys(data);
    
    // 1. Initial fast render with cached profiles
    const initialChats = chatUserIds.map(uid => ({
      userId: uid,
      profile: getCachedProfile(uid),
      ...data[uid],
    })).sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
    
    callback(initialChats);

    // 2. Background fetch for missing profiles
    prefetchProfiles(chatUserIds).then(() => {
        const updatedChats = chatUserIds.map(uid => ({
            userId: uid,
            profile: getCachedProfile(uid),
            ...data[uid],
        })).sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
        callback(updatedChats);
    });
  });
  return () => unsubscribe();
}

export async function markMessagesRead(fromUserId, toUserId) {
  const chatId = getChatId(fromUserId, toUserId);
  const messagesRef = ref(db, `chats/${chatId}/messages`);
  // Limit read marking to latest messages for speed
  const snap = await get(query(messagesRef, orderByChild("timestamp"), limitToLast(200)));
  if (!snap.exists()) return;

  const updates = {};
  Object.entries(snap.val()).forEach(([msgId, msg]) => {
    if (msg.senderId !== fromUserId && !msg.read) {
      updates[`chats/${chatId}/messages/${msgId}/read`] = true;
    }
  });
  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
  }
}

// ============================================
// ANALYTICS FUNCTIONS
// ============================================

export async function trackProfileView(viewerId, profileUserId) {
  if (viewerId === profileUserId) return; // Don't track self-views
  const viewRef = push(ref(db, `analytics/${profileUserId}/profileViews`));
  await set(viewRef, { viewerId, timestamp: Date.now() });
}

export function listenToAnalytics(userId, callback) {
  if (!userId) { callback({ profileViews: 0, recentViews: [] }); return () => {}; }
  const analyticsRef = ref(db, `analytics/${userId}`);
  const postsRef = query(ref(db, "posts"), orderByChild("authorId"), equalTo(userId));

  let analyticsData = { profileViews: 0, recentViews: [] };
  let postsData = { totalLikes: 0, totalComments: 0, postCount: 0, engagementRate: 0 };

  const unsub1 = onValue(analyticsRef, (snap) => {
    try {
      if (snap.exists()) {
        const data = snap.val();
        const views = data.profileViews ? Object.values(data.profileViews) : [];
        const now = Date.now();
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        analyticsData = {
          profileViews: views.length,
          weeklyViews: views.filter(v => v.timestamp > weekAgo).length,
          recentViews: views.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10),
        };
      }
      mergeCallback();
    } catch (err) {
      console.error("Error in listenToAnalytics (unsub1):", err);
      mergeCallback();
    }
  }, (err) => {
    console.error("Firebase analytics error:", err);
    mergeCallback();
  });

  const unsub2 = onValue(postsRef, (snap) => {
    try {
      if (snap.exists()) {
        const data = snap.val();
        const posts = Object.values(data);
        const totalLikes = posts.reduce((sum, p) => sum + (p.likes ? Object.keys(p.likes).length : 0), 0);
        const totalComments = posts.reduce((sum, p) => sum + (p.comments ? Object.keys(p.comments).length : 0), 0);
        const postCount = posts.length;
        const engagementRate = postCount > 0 ? ((totalLikes + totalComments) / postCount).toFixed(1) : 0;
        postsData = { totalLikes, totalComments, postCount, engagementRate };
      }
      mergeCallback();
    } catch (err) {
      console.error("Error in listenToAnalytics (unsub2):", err);
      mergeCallback();
    }
  }, (err) => {
    console.error("Firebase analytics posts error:", err);
    mergeCallback();
  });

  function mergeCallback() {
    callback({ ...analyticsData, ...postsData });
  }

  return () => { unsub1(); unsub2(); };
}

// ============================================
// STORIES FUNCTIONS (24-hour auto-delete)
// ============================================

export async function createStory(userId, imageUrl, caption) {
  const storiesRef = ref(db, `stories/${userId}`);
  const newStoryRef = push(storiesRef);
  await set(newStoryRef, {
    imageUrl,
    caption: caption || "",
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    views: {},
  });
  return newStoryRef.key;
}

export function listenToStories(callback) {
  const storiesRef = ref(db, "stories");
  const unsubscribe = onValue(storiesRef, async (snap) => {
    if (!snap.exists()) { 
      callback([]); 
      return; 
    }
    
    const data = snap.val();
    const now = Date.now();
    const allStories = [];
    const expiredCleanup = {};

    Object.entries(data).forEach(([userId, userStories]) => {
      if (!userStories || typeof userStories !== "object") return;
      
      const activeStories = [];
      Object.entries(userStories).forEach(([storyId, story]) => {
        if (!story || typeof story !== "object") return;
        
        if (story.expiresAt && story.expiresAt < now) {
          expiredCleanup[`stories/${userId}/${storyId}`] = null;
        } else if (story.imageUrl) {
          activeStories.push({ 
            id: storyId, 
            userId, 
            imageUrl: story.imageUrl,
            caption: story.caption || "",
            createdAt: story.createdAt || Date.now(),
            expiresAt: story.expiresAt || Date.now() + 24 * 60 * 60 * 1000,
            views: story.views || {}
          });
        }
      });
      
      if (activeStories.length > 0) {
        const latestAt = Math.max(...activeStories.map(s => s.createdAt || 0));
        allStories.push({ 
          userId, 
          stories: activeStories, 
          latestAt,
          profile: null // Will be populated below
        });
      }
    });

    // Clean up expired stories
    if (Object.keys(expiredCleanup).length > 0) {
      update(ref(db), expiredCleanup).catch(() => {});
    }

    // Prefetch ALL user profiles first (including those with stories)
    const userIds = allStories.map(s => s.userId);
    if (userIds.length > 0) {
      // First batch prefetch
      await prefetchProfiles(userIds);
      
      // Then ensure all are loaded
      const promises = userIds.map(uid => ensureProfileLoaded(uid));
      await Promise.all(promises);
      
      // Attach profiles to story groups
      allStories.forEach(group => {
        group.profile = getCachedProfile(group.userId) || { 
          displayName: "User", 
          photoURL: null,
          uid: group.userId 
        };
      });
    }

    allStories.sort((a, b) => (b.latestAt || 0) - (a.latestAt || 0));
    callback(allStories);
  });
  return () => unsubscribe();
}

export async function viewStory(storyUserId, storyId, viewerUserId) {
  const viewRef = ref(db, `stories/${storyUserId}/${storyId}/views/${viewerUserId}`);
  await set(viewRef, Date.now());
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function timeAgo(timestamp) {
  if (!timestamp || isNaN(timestamp)) return "Just now";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function getAvatarColor(name) {
  const colors = [
    "#8b5cf6", "#ec4899", "#06b6d4", "#10b981",
    "#f59e0b", "#ef4444", "#6366f1", "#14b8a6",
  ];
  const safeName = (typeof name === 'string' ? name : String(name || "")).trim();
  let hash = 0;
  for (let i = 0; i < safeName.length; i++) {
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Ensure debounce is robust
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
