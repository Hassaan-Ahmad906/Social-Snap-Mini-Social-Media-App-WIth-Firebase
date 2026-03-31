import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { listenToNotifications, timeAgo, getAvatarUrl } from "../App.js";
import Navbar from "./Navbar";
import "./Notifications.css";

export default function Notifications() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, likes, comments, follows
  useEffect(() => {
    if (!currentUser) return;
    const unsub = listenToNotifications(currentUser.uid, (notifs) => {
      setNotifications(notifs);
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "likes") return n.type === "like";
    if (filter === "comments") return n.type === "comment";
    if (filter === "follows") return n.type === "follow";
    return true;
  });

  return (
    <div className="notifications-page">
      <Navbar />
      <main className="notifications-main">
        <div className="notifications-container">
          {/* Header */}
          <div className="notifications-header">
            <h1>Activity</h1>
            <p className="notifications-subtitle">
              {notifications.length > 0
                ? `You have ${notifications.length} notification${notifications.length !== 1 ? "s" : ""}`
                : "No activity yet"}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="notif-filter-tabs">
            <button
              className={`notif-filter-tab ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            <button
              className={`notif-filter-tab ${filter === "likes" ? "active" : ""}`}
              onClick={() => setFilter("likes")}
            >
              ❤️ Likes
            </button>
            <button
              className={`notif-filter-tab ${filter === "comments" ? "active" : ""}`}
              onClick={() => setFilter("comments")}
            >
              💬 Comments
            </button>
            <button
              className={`notif-filter-tab ${filter === "follows" ? "active" : ""}`}
              onClick={() => setFilter("follows")}
            >
              👥 Follows
            </button>
          </div>

          {/* Notifications List */}
          <div className="notifications-list">
            {loading ? (
              <div className="notif-loading">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="notif-skeleton">
                    <div className="notif-skeleton-avatar"></div>
                    <div className="notif-skeleton-text">
                      <div className="notif-skeleton-line long"></div>
                      <div className="notif-skeleton-line short"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="notif-empty-state">
                <div className="notif-empty-icon">
                  {filter === "likes" ? "❤️" : filter === "comments" ? "💬" : "🔔"}
                </div>
                <h3>No {filter === "all" ? "" : filter} activity yet</h3>
                <p>When people interact with your posts, you'll see it here.</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const profile = notif.fromUserProfile;
                const avatarUrl = profile ? getAvatarUrl(profile) : null;
                return (
                  <div
                    key={notif.id}
                    className="notif-page-item"
                    onClick={() => navigate(`/profile/${notif.fromUserId}`)}
                  >
                    <div className="notif-page-avatar-wrap">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="notif-page-avatar-img" />
                      ) : (
                        <div className="notif-page-avatar-placeholder">
                          {(notif.fromUserName || "U")[0].toUpperCase()}
                        </div>
                      )}
                      <div className={`notif-type-badge ${notif.type}`}>
                        {notif.type === "like" ? "❤️" : notif.type === "comment" ? "💬" : "👥"}
                      </div>
                    </div>
                    <div className="notif-page-content">
                      <p>
                        <strong>{profile?.displayName || notif.fromUserName || "Someone"}</strong>{" "}
                        {notif.type === "like"
                          ? "liked your post"
                          : notif.type === "comment"
                          ? `commented: "${notif.commentText}"`
                          : "started following you"}
                      </p>
                      {notif.postContent && (
                        <span className="notif-post-preview">"{notif.postContent}..."</span>
                      )}
                      <span className="notif-page-time">{timeAgo(notif.timestamp)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
