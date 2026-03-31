import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  listenToUserProfile,
  listenToNotifications,
  searchUsers,
  getAvatarUrl,
  getAvatarColor,
  debounce,
  getUsersOnce,
  prefetchUserPosts,
} from "../App.js";
import Logo from "./Logo";
import "./Navbar.css";

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userProfile, setUserProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    const unsub1 = listenToUserProfile(currentUser.uid, setUserProfile);
    const unsub2 = listenToNotifications(currentUser.uid, setNotifications);
    // Preload users list in background so search / explore / suggestions are instant
    getUsersOnce(800).catch(() => {});
    return () => { unsub1(); unsub2(); };
  }, [currentUser]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (query.length < 2) { setSearchResults([]); setShowSearch(false); return; }
      setSearchLoading(true);
      try {
        const results = await searchUsers(query);
        setSearchResults(results.filter(u => u.uid !== currentUser?.uid).slice(0, 8));
        setShowSearch(true);
      } catch (err) { console.error("Search error:", err); }
      setSearchLoading(false);
    }, 300),
    [currentUser]
  );

  function handleSearchChange(e) {
    const q = e.target.value;
    setSearchQuery(q);
    debouncedSearch(q);
  }
  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      navigate("/login");
    }
  }

  const avatarUrl = getAvatarUrl(userProfile);
  const displayName = userProfile?.displayName || currentUser?.displayName || "User";
  const unreadCount = notifications.filter(n => !n.read).length;

  function isActive(path) {
    return location.pathname === path;
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <div className="navbar-logo" onClick={() => navigate("/")}>
          <Logo size={32} showText={true} />
        </div>

        {/* Search */}
        <div className="navbar-search" ref={searchRef}>
          <div className="search-container">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.length >= 2 && setShowSearch(true)}
              className="search-input"
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => { setSearchQuery(""); setSearchResults([]); setShowSearch(false); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            )}
          </div>

          {showSearch && searchResults.length > 0 && (
            <div className="search-dropdown">
              {searchResults.map((user) => (
                <div
                  key={user.uid}
                  className="search-result-item"
                  onClick={() => { prefetchUserPosts(user.uid).catch(() => {}); navigate(`/profile/${user.uid}`); setShowSearch(false); setSearchQuery(""); }}
                >
                  {getAvatarUrl(user) ? (
                    <img src={getAvatarUrl(user)} alt="" className="search-result-avatar" />
                  ) : (
                    <div className="search-result-avatar-placeholder" style={{ background: getAvatarColor(user.displayName) }}>
                      {(user.displayName || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="search-result-info">
                    <span className="search-result-name">{user.displayName}</span>
                    <span className="search-result-email">@{user.username || user.displayName?.toLowerCase().replace(/\s/g, '')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nav Icons */}
        <div className="navbar-actions">
          <button className={`nav-icon-btn ${isActive("/") ? "active" : ""}`} onClick={() => navigate("/")} title="Home">
            <svg width="22" height="22" viewBox="0 0 24 24" fill={isActive("/") ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </button>
          <button className={`nav-icon-btn ${isActive("/explore") ? "active" : ""}`} onClick={() => navigate("/explore")} title="Explore">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
            </svg>
          </button>
          <button className={`nav-icon-btn ${isActive("/chat") ? "active" : ""}`} onClick={() => navigate("/chat")} title="Messages">
            <svg width="22" height="22" viewBox="0 0 24 24" fill={isActive("/chat") ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>

          {/* Notifications */}
          <div className="nav-icon-wrapper" ref={notifRef}>
            <button
              className={`nav-icon-btn ${isActive("/notifications") ? "active" : ""}`}
              onClick={() => setShowNotifs(!showNotifs)}
              title="Notifications"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={showNotifs ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </button>

            {showNotifs && (
              <div className="notif-dropdown">
                <div className="notif-header">
                  <h4>Notifications</h4>
                  <button className="notif-see-all" onClick={() => { navigate("/notifications"); setShowNotifs(false); }}>See All</button>
                </div>
                {notifications.length === 0 ? (
                  <div className="notif-empty">No notifications yet ✨</div>
                ) : (
                  <div className="notif-list">
                    {notifications.slice(0, 5).map((notif) => (
                      <div key={notif.id} className={`notif-item ${notif.read ? "" : "unread"}`}>
                        <span className="notif-icon">
                          {notif.type === "like" ? "❤️" : notif.type === "comment" ? "💬" : notif.type === "follow" ? "👥" : "🔔"}
                        </span>
                        <div className="notif-content">
                          <span className="notif-text">
                            {notif.type === "like" && <><strong>{notif.fromUserName || "Someone"}</strong> liked your post</>}
                            {notif.type === "comment" && <><strong>{notif.fromUserName}</strong> commented: "{notif.commentText}"</>}
                            {notif.type === "follow" && <><strong>{notif.fromUserName || "Someone"}</strong> started following you</>}
                          </span>
                          <span className="notif-time">{notif.timestamp ? new Date(notif.timestamp).toLocaleDateString() : ""}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="nav-icon-wrapper" ref={profileRef}>
            <button className="nav-profile-btn" onClick={() => setShowProfile(!showProfile)}>
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={displayName} 
                  className="nav-avatar-img" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className="nav-avatar" 
                style={{ 
                  background: getAvatarColor(displayName),
                  display: avatarUrl ? 'none' : 'flex'
                }}
              >
                {displayName[0].toUpperCase()}
              </div>
            </button>

            {showProfile && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-header">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="dropdown-avatar-img" />
                  ) : (
                    <div className="dropdown-avatar" style={{ background: getAvatarColor(displayName) }}>
                      {displayName[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="dropdown-name">{displayName}</div>
                    <div className="dropdown-email">{currentUser?.email}</div>
                  </div>
                </div>
                <div className="profile-dropdown-links">
                  <button onClick={() => { navigate("/profile"); setShowProfile(false); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    My Profile
                  </button>
                  <button onClick={() => { navigate("/analytics"); setShowProfile(false); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="20" x2="18" y2="10"/>
                      <line x1="12" y1="20" x2="12" y2="4"/>
                      <line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                    Analytics
                  </button>
                  <button onClick={() => { navigate("/settings"); setShowProfile(false); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                    Settings
                  </button>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-logout" onClick={handleLogout}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
