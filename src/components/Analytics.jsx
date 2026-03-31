import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { listenToAnalytics, listenToUserProfile } from "../App.js";
import Navbar from "./Navbar";
import "./Analytics.css";

export default function Analytics() {
  const { currentUser } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const unsub1 = listenToAnalytics(currentUser.uid, (data) => {
      setAnalytics(data);
      setLoading(false);
    });
    const unsub2 = listenToUserProfile(currentUser.uid, setProfile);
    return () => { unsub1(); unsub2(); };
  }, [currentUser]);

  if (loading) {
    return (
      <div className="analytics-page">
        <Navbar />
        <main className="analytics-main">
          <div className="analytics-loading">
            <div className="spinner"></div>
            <p>Loading analytics...</p>
          </div>
        </main>
      </div>
    );
  }

  const stats = [
    {
      label: "Profile Views",
      value: analytics?.profileViews || 0,
      icon: "👁️",
      color: "#8b5cf6",
      sub: `${analytics?.weeklyViews || 0} this week`,
    },
    {
      label: "Total Posts",
      value: analytics?.postCount || 0,
      icon: "📸",
      color: "#3b82f6",
      sub: "All time",
    },
    {
      label: "Total Likes",
      value: analytics?.totalLikes || 0,
      icon: "❤️",
      color: "#ef4444",
      sub: "Received",
    },
    {
      label: "Total Comments",
      value: analytics?.totalComments || 0,
      icon: "💬",
      color: "#10b981",
      sub: "Received",
    },
    {
      label: "Engagement Rate",
      value: analytics?.engagementRate || 0,
      icon: "📊",
      color: "#f59e0b",
      sub: "Avg per post",
    },
    {
      label: "Followers",
      value: profile?.followersCount || 0,
      icon: "👥",
      color: "#ec4899",
      sub: `Following ${profile?.followingCount || 0}`,
    },
  ];

  return (
    <div className="analytics-page">
      <Navbar />
      <main className="analytics-main">
        <div className="analytics-container">
          <div className="analytics-header">
            <h1>📊 Analytics Dashboard</h1>
            <p className="analytics-subtitle">Track your growth and engagement on SocialSnap</p>
          </div>

          {/* Stats Grid */}
          <div className="analytics-stats-grid">
            {stats.map((stat, i) => (
              <div key={i} className="analytics-stat-card" style={{ "--stat-color": stat.color }}>
                <div className="stat-card-icon">{stat.icon}</div>
                <div className="stat-card-value">{stat.value}</div>
                <div className="stat-card-label">{stat.label}</div>
                <div className="stat-card-sub">{stat.sub}</div>
                <div className="stat-card-glow"></div>
              </div>
            ))}
          </div>

          {/* Engagement Overview */}
          <div className="analytics-section">
            <h3>Engagement Overview</h3>
            <div className="engagement-bars">
              <div className="engagement-bar-item">
                <div className="bar-label">
                  <span>Likes per Post</span>
                  <span className="bar-value">
                    {analytics?.postCount > 0
                      ? (analytics.totalLikes / analytics.postCount).toFixed(1)
                      : 0}
                  </span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill likes-bar"
                    style={{
                      width: `${Math.min(100, (analytics?.totalLikes / Math.max(1, analytics?.postCount)) * 10)}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="engagement-bar-item">
                <div className="bar-label">
                  <span>Comments per Post</span>
                  <span className="bar-value">
                    {analytics?.postCount > 0
                      ? (analytics.totalComments / analytics.postCount).toFixed(1)
                      : 0}
                  </span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill comments-bar"
                    style={{
                      width: `${Math.min(100, (analytics?.totalComments / Math.max(1, analytics?.postCount)) * 10)}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="engagement-bar-item">
                <div className="bar-label">
                  <span>Post Reach</span>
                  <span className="bar-value">
                    {(analytics?.totalLikes || 0) + (analytics?.totalComments || 0) + (analytics?.profileViews || 0)}
                  </span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill reach-bar"
                    style={{
                      width: `${Math.min(100, ((analytics?.totalLikes || 0) + (analytics?.totalComments || 0) + (analytics?.profileViews || 0)) * 2)}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="analytics-section">
            <h3>💡 Growth Tips</h3>
            <div className="tips-grid">
              <div className="tip-card">
                <span className="tip-icon">🕐</span>
                <h4>Post Consistently</h4>
                <p>Regular posting increases your visibility and keeps followers engaged.</p>
              </div>
              <div className="tip-card">
                <span className="tip-icon">💬</span>
                <h4>Engage with Others</h4>
                <p>Comment and like other posts to build meaningful connections.</p>
              </div>
              <div className="tip-card">
                <span className="tip-icon">📸</span>
                <h4>Use Quality Images</h4>
                <p>Posts with images get significantly more engagement than text-only posts.</p>
              </div>
              <div className="tip-card">
                <span className="tip-icon">📖</span>
                <h4>Share Stories</h4>
                <p>Stories keep you at the top of the feed and appear more personal.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
