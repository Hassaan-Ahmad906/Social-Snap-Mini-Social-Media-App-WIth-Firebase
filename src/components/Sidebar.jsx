import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getAvatarColor, getAvatarUrl, listenToNotifications, listenToUserProfile } from "../App.js";
import "./Sidebar.css";

export default function Sidebar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifCount, setNotifCount] = useState(0);
  const [dbProfile, setDbProfile] = useState(null);

  // Listen to user profile from database (has the correct photoURL)
  useEffect(() => {
    if (!currentUser) return;
    const unsub = listenToUserProfile(currentUser.uid, (profile) => {
      setDbProfile(profile);
    });
    return () => unsub();
  }, [currentUser]);

  // Use DB profile for avatar (it has the uploaded photo), fallback to Auth
  const avatarUrl = getAvatarUrl(dbProfile || currentUser);

  // Listen for notification count
  useEffect(() => {
    if (!currentUser) return;
    const unsub = listenToNotifications(currentUser.uid, (notifs) => {
      setNotifCount(notifs.length);
    });
    return () => unsub();
  }, [currentUser]);

  const navItems = [
    { icon: "home", label: "Home", path: "/", badge: null },
    { icon: "explore", label: "Explore", path: "/explore", badge: null },
    { icon: "chat", label: "Messages", path: "/chat", badge: null },
    { icon: "bell", label: "Notifications", path: "/notifications", badge: notifCount > 0 ? (notifCount > 9 ? "9+" : String(notifCount)) : null },
    { icon: "user", label: "Profile", path: "/profile", badge: null },
    { icon: "analytics", label: "Analytics", path: "/analytics", badge: null },
    { icon: "bookmark", label: "Saved", path: "/profile?tab=saved", badge: null },
    { icon: "settings", label: "Settings", path: "/settings", badge: null },
  ];

  const icons = {
    home: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    explore: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
      </svg>
    ),
    user: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    bookmark: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    chat: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    bell: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
    analytics: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    settings: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  };

  async function handleLogout() {
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      navigate("/login");
    }
  }

  return (
    <aside className="sidebar">
      {/* User Card */}
      <div className="sidebar-user-card" onClick={() => navigate("/profile")}>
        <div className="sidebar-cover">
          {dbProfile?.coverURL && (
            <img src={dbProfile.coverURL} alt="" className="sidebar-cover-img" />
          )}
        </div>
        <div className="sidebar-user-info">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="sidebar-avatar-img" />
          ) : (
            <div
              className="sidebar-avatar"
              style={{ background: getAvatarColor(dbProfile?.displayName || currentUser?.displayName) }}
            >
              {(dbProfile?.displayName || currentUser?.displayName || "U")[0].toUpperCase()}
            </div>
          )}
          <h3 className="sidebar-name">{dbProfile?.displayName || currentUser?.displayName}</h3>
          <p className="sidebar-email">{currentUser?.email}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={`sidebar-nav-item ${location.pathname === item.path ? "active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            {icons[item.icon]}
            <span>{item.label}</span>
            {item.badge && <span className="sidebar-badge">{item.badge}</span>}
          </button>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="sidebar-logout">
        <button className="sidebar-logout-btn" onClick={handleLogout}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Log Out</span>
        </button>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <p>© 2026 SocialSnap</p>
      </div>
    </aside>
  );
}
