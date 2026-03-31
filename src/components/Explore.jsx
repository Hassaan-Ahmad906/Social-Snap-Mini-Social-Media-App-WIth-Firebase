import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { listenToPosts, getAvatarUrl, getAvatarColor, getUsersOnce, prefetchUserPosts } from "../App.js";
import Navbar from "./Navbar";
import PostCard from "./PostCard";
import "./Explore.css";

const TRENDING_TOPICS = [
  { tag: "#ReactJS", posts: "2.4K posts", category: "Technology", color: "#61dafb" },
  { tag: "#WebDev", posts: "1.8K posts", category: "Development", color: "#8b5cf6" },
  { tag: "#Firebase", posts: "956 posts", category: "Backend", color: "#ffca28" },
  { tag: "#JavaScript", posts: "5.2K posts", category: "Programming", color: "#f7df1e" },
  { tag: "#UIDesign", posts: "1.1K posts", category: "Design", color: "#ec4899" },
  { tag: "#DarkMode", posts: "3.1K posts", category: "Trending", color: "#6366f1" },
  { tag: "#OpenSource", posts: "2.8K posts", category: "Community", color: "#10b981" },
  { tag: "#CSS", posts: "1.5K posts", category: "Styling", color: "#3b82f6" },
];

export default function Explore() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState(() => {
    try {
      const raw = localStorage.getItem("explorePeopleCache");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("trending");
  const [loading, setLoading] = useState(true);
  const [peopleLoading, setPeopleLoading] = useState(false);

  useEffect(() => {
    const unsub2 = listenToPosts((allPosts) => {
      setPosts(allPosts);
      setLoading(false);
    });
    return () => {
      unsub2();
    };
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;
    async function loadPeople() {
      if (activeTab !== "people") return;
      if (users.length > 0) return;
      setPeopleLoading(true);
      try {
        const allUsers = await getUsersOnce(300);
        if (cancelled) return;
        const filtered = allUsers.filter((u) => u?.uid && u.uid !== currentUser?.uid);
        setUsers(filtered);
        try {
          localStorage.setItem("explorePeopleCache", JSON.stringify(filtered));
        } catch {}
      } catch (e) {
        console.error("Failed to load people:", e);
      } finally {
        if (!cancelled) setPeopleLoading(false);
      }
    }
    loadPeople();
    return () => {
      cancelled = true;
    };
  }, [activeTab, currentUser, users.length]);

  // Get top posts (most liked)
  const topPosts = [...posts]
    .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
    .slice(0, 10);

  return (
    <div className="explore-page">
      <Navbar />
      <main className="explore-main">
        <div className="explore-container">
          {/* Header */}
          <div className="explore-header">
            <h1>Explore</h1>
            <p className="explore-subtitle">Discover trending topics and popular content</p>
          </div>

          {/* Tabs */}
          <div className="explore-tabs">
            <button
              className={`explore-tab ${activeTab === "trending" ? "active" : ""}`}
              onClick={() => setActiveTab("trending")}
            >
              🔥 Trending
            </button>
            <button
              className={`explore-tab ${activeTab === "people" ? "active" : ""}`}
              onClick={() => setActiveTab("people")}
            >
              👥 People
            </button>
            <button
              className={`explore-tab ${activeTab === "popular" ? "active" : ""}`}
              onClick={() => setActiveTab("popular")}
            >
              ⭐ Popular Posts
            </button>
          </div>

          {/* Content */}
          <div className="explore-content">
            {activeTab === "trending" && (
              <div className="trending-grid">
                {TRENDING_TOPICS.map((topic, i) => (
                  <div
                    key={i}
                    className="trending-card"
                    onClick={() => navigate(`/?search=${encodeURIComponent(topic.tag)}`)}
                  >
                    <div className="trending-card-accent" style={{ background: topic.color }}></div>
                    <div className="trending-card-content">
                      <span className="trending-card-category">{topic.category}</span>
                      <h4 className="trending-card-tag">{topic.tag}</h4>
                      <span className="trending-card-count">{topic.posts}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "people" && (
              <div className="explore-people-list">
                {peopleLoading ? (
                  <div className="explore-empty">
                    <div className="spinner"></div>
                  </div>
                ) : users.length === 0 ? (
                  <div className="explore-empty">
                    <span className="explore-empty-icon">👥</span>
                    <h3>No other users yet</h3>
                    <p>Invite your friends to join SocialSnap!</p>
                  </div>
                ) : (
                  users.map((user) => {
                    const avatarUrl = getAvatarUrl(user);
                    return (
                      <div
                        key={user.uid}
                        className="explore-person"
                        onClick={() => { prefetchUserPosts(user.uid).catch(() => {}); navigate(`/profile/${user.uid}`); }}
                      >
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" className="explore-person-avatar" loading="lazy" />
                        ) : (
                          <div
                            className="explore-person-avatar-placeholder"
                            style={{ background: getAvatarColor(user.displayName) }}
                          >
                            {(user.displayName || "U")[0].toUpperCase()}
                          </div>
                        )}
                        <div className="explore-person-info">
                          <span className="explore-person-name">{user.displayName}</span>
                          <span className="explore-person-bio">{user.bio || "📸 SocialSnap user"}</span>
                        </div>
                        <button
                          className="explore-view-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            prefetchUserPosts(user.uid).catch(() => {});
                            navigate(`/profile/${user.uid}`);
                          }}
                        >
                          View
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === "popular" && (
              <div className="explore-posts">
                {loading ? (
                  <div className="explore-empty">
                    <div className="spinner"></div>
                  </div>
                ) : topPosts.length === 0 ? (
                  <div className="explore-empty">
                    <span className="explore-empty-icon">⭐</span>
                    <h3>No posts yet</h3>
                    <p>Be the first to share something!</p>
                  </div>
                ) : (
                  topPosts.map((post) => <PostCard key={post.id} post={post} />)
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
