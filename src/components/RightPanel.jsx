import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getAvatarColor, getAvatarUrl, followUser, unfollowUser, listenToFollowing, getUsersOnce, prefetchUserPosts } from "../App.js";
import { seedDatabase } from "../utils/seeder";
import "./RightPanel.css";

const TRENDING_TOPICS = [
  { tag: "#ReactJS", posts: "2.4K posts", category: "Technology" },
  { tag: "#WebDev", posts: "1.8K posts", category: "Development" },
  { tag: "#Firebase", posts: "956 posts", category: "Backend" },
  { tag: "#JavaScript", posts: "5.2K posts", category: "Programming" },
  { tag: "#UIDesign", posts: "1.1K posts", category: "Design" },
];

export default function RightPanel() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [followedUsers, setFollowedUsers] = useState(new Set());
  const [followLoading, setFollowLoading] = useState(new Set());
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Load suggestions quickly from cache, then refresh in background
  useEffect(() => {
    const cacheKey = currentUser ? `suggestionsCache_${currentUser.uid}` : null;
    if (!cacheKey) return;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSuggestedUsers(parsed);
        }
      }
    } catch (e) {
      // ignore cache errors
    }

    let cancelled = false;
    async function loadSuggestions() {
      setSuggestionsLoading(true);
      try {
        const allUsers = await getUsersOnce(200);
        if (cancelled) return;
        const filtered = allUsers
          .filter(u => u?.uid && (!currentUser || u.uid !== currentUser.uid))
          .map(u => ({
            uid: u.uid,
            name: u.displayName || u.name || "",
            email: u.email || "",
            bio: u.bio || "📸 SocialSnap user",
            photoURL: u.photoURL || null,
          }));
        // Shuffle and take 5
        const shuffled = filtered.sort(() => 0.5 - Math.random());
        const finalSuggestions = shuffled.slice(0, 5);
        setSuggestedUsers(finalSuggestions);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(finalSuggestions));
        } catch (e) {
          // ignore
        }
      } catch (e) {
        console.error("Failed to load suggestions:", e);
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    }
    loadSuggestions();
    return () => { cancelled = true; };
  }, [currentUser]);

  // Listen to who current user follows
  useEffect(() => {
    if (!currentUser) return;
    const unsub = listenToFollowing(currentUser.uid, (followingList) => {
      setFollowedUsers(new Set(followingList.map(u => u.uid)));
    });
    return () => unsub();
  }, [currentUser]);

  async function handleFollow(uid) {
    // Optimistic Update
    const isFollowing = followedUsers.has(uid);
    setFollowedUsers(prev => {
      const next = new Set(prev);
      if (isFollowing) next.delete(uid);
      else next.add(uid);
      return next;
    });

    try {
      if (isFollowing) {
        await unfollowUser(currentUser.uid, uid);
      } else {
        await followUser(currentUser.uid, uid);
      }
    } catch (err) { 
      console.error("Follow error:", err);
      // Revert on error
      setFollowedUsers(prev => {
        const next = new Set(prev);
        if (isFollowing) next.add(uid);
        else next.delete(uid);
        return next;
      });
    }
  }

  function handleTrendClick(tag) {
    navigate(`/?search=${encodeURIComponent(tag)}`);
  }

  return (
    <aside className="right-panel">
      {/* Suggested Users */}
      <div className="panel-card">
        <div className="panel-card-header">
          <h3>Suggested for you</h3>
          <button className="see-all-btn" onClick={() => navigate("/explore")}>See All</button>
        </div>
        <div className="suggested-list">
          {suggestionsLoading && suggestedUsers.length === 0 ? (
            <div className="no-suggestions">
              <p>Loading suggestions...</p>
            </div>
          ) : suggestedUsers.length > 0 ? (
            suggestedUsers.map((user) => (
              <div key={user.uid} className="suggested-user">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.name}
                      className="suggested-avatar-img"
                      loading="lazy"
                      onClick={() => { prefetchUserPosts(user.uid).catch(() => {}); navigate(`/profile/${user.uid}`); }}
                    />
                  ) : (
                    <div
                      className="suggested-avatar"
                      style={{ background: getAvatarColor(user.name) }}
                      onClick={() => { prefetchUserPosts(user.uid).catch(() => {}); navigate(`/profile/${user.uid}`); }}
                    >
                      {(user.name || "U")[0].toUpperCase()}
                    </div>
                  )}
                <div className="suggested-info" onClick={() => { prefetchUserPosts(user.uid).catch(() => {}); navigate(`/profile/${user.uid}`); }}>
                  <span className="suggested-name">{user.name}</span>
                  <span className="suggested-bio">{user.bio}</span>
                </div>
                <button
                  className={`follow-btn ${followedUsers.has(user.uid) ? "following" : ""}`}
                  onClick={() => handleFollow(user.uid)}
                >
                  {followedUsers.has(user.uid) ? "Following" : "Follow"}
                </button>
              </div>
            ))
          ) : (
            <div className="no-suggestions">
              <p>No suggestions yet. Invite friends to join! 🎉</p>
              <button 
                onClick={() => seedDatabase(20)} 
                style={{
                  marginTop: '10px',
                  padding: '5px 10px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                Seed 20 Users (Dev)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Trending */}
      <div className="panel-card">
        <div className="panel-card-header">
          <h3>🔥 Trending</h3>
          <button className="see-all-btn" onClick={() => navigate("/explore")}>Explore</button>
        </div>
        <div className="trending-list">
          {TRENDING_TOPICS.map((topic, index) => (
            <div key={index} className="trending-item" onClick={() => handleTrendClick(topic.tag)}>
              <div className="trending-info">
                <span className="trending-category">{topic.category}</span>
                <span className="trending-tag">{topic.tag}</span>
                <span className="trending-posts">{topic.posts}</span>
              </div>
              <svg className="trending-more" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
              </svg>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Links */}
      <div className="panel-footer">
        <div className="footer-links">
          <a href="#" onClick={(e) => { e.preventDefault(); navigate("/settings"); }}>About</a>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate("/settings"); }}>Help</a>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate("/settings"); }}>Privacy</a>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate("/settings"); }}>Terms</a>
        </div>
        <p className="footer-copyright">© 2026 SocialSnap</p>
      </div>
    </aside>
  );
}
