import { useState, useEffect } from "react";
import { listenToPosts, getPostsCache } from "../App.js";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import RightPanel from "./RightPanel";
import Stories from "./Stories";
import CreatePost from "./CreatePost";
import PostCard from "./PostCard";
import "./Feed.css";

import { useSearchParams } from "react-router-dom";
// ... imports

export default function Feed() {
  const [posts, setPosts] = useState(() => getPostsCache() || []);
  const [loading, setLoading] = useState(() => (getPostsCache() || []).length === 0);
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("search");

  useEffect(() => {
    const unsubscribe = listenToPosts((postsData) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const filtered = postsData.filter(p => 
          p.content?.toLowerCase().includes(query) || 
          p.authorName?.toLowerCase().includes(query)
        );
        setPosts(filtered);
      } else {
        setPosts(postsData);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [searchQuery]);

  return (
    <div className="feed-page">
      <Navbar />
      <main className="feed-layout">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Center Feed */}
        <div className="feed-center">
          <CreatePost />

          {loading ? (
            <div className="feed-loading">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-header">
                    <div className="skeleton-avatar"></div>
                    <div className="skeleton-lines">
                      <div className="skeleton-line w60"></div>
                      <div className="skeleton-line w40"></div>
                    </div>
                  </div>
                  <div className="skeleton-body">
                    <div className="skeleton-line w100"></div>
                    <div className="skeleton-line w80"></div>
                    <div className="skeleton-line w60"></div>
                  </div>
                  <div className="skeleton-actions">
                    <div className="skeleton-btn"></div>
                    <div className="skeleton-btn"></div>
                    <div className="skeleton-btn"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="feed-empty">
              <div className="empty-illustration">
                <div className="empty-circle">
                  <span>✨</span>
                </div>
                <div className="empty-sparkle s1">⭐</div>
                <div className="empty-sparkle s2">💫</div>
                <div className="empty-sparkle s3">🌟</div>
              </div>
              <h3>No posts yet</h3>
              <p>Be the first to share something amazing!</p>
              <p className="empty-hint">Double-tap posts to ❤️ like them!</p>
            </div>
          ) : (
            <div className="posts-list">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>

        {/* Right Panel */}
        <RightPanel />
      </main>
    </div>
  );
}
