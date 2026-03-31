import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import "./Settings.css";

export default function Settings() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("account");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") !== "light");
  const [notifLikes, setNotifLikes] = useState(true);
  const [notifComments, setNotifComments] = useState(true);
  const [notifFollows, setNotifFollows] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [showActivity, setShowActivity] = useState(true);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.body.classList.remove("light-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.add("light-mode");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  async function handleLogout() {
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      navigate("/login");
    }
  }

  const sections = [
    { id: "account", label: "Account", icon: "👤" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "privacy", label: "Privacy & Security", icon: "🔒" },
    { id: "appearance", label: "Appearance", icon: "🎨" },
    { id: "about", label: "About", icon: "ℹ️" },
  ];

  return (
    <div className="settings-page">
      <Navbar />
      <main className="settings-main">
        <div className="settings-layout">
          {/* Settings Sidebar */}
          <div className="settings-sidebar">
            <h2>Settings</h2>
            <nav className="settings-nav">
              {sections.map((section) => (
                <button
                  key={section.id}
                  className={`settings-nav-item ${activeSection === section.id ? "active" : ""}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <span className="settings-nav-icon">{section.icon}</span>
                  <span>{section.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Settings Content */}
          <div className="settings-content">
            {activeSection === "account" && (
              <div className="settings-section">
                <h3>Account Information</h3>
                <p className="settings-section-desc">Manage your account details</p>
                <div className="settings-card">
                  <div className="settings-field">
                    <label>Display Name</label>
                    <div className="settings-field-value">{currentUser?.displayName || "Not set"}</div>
                  </div>
                  <div className="settings-field">
                    <label>Email</label>
                    <div className="settings-field-value">{currentUser?.email || "Not set"}</div>
                  </div>
                  <div className="settings-field">
                    <label>Account ID</label>
                    <div className="settings-field-value settings-uid">{currentUser?.uid}</div>
                  </div>
                </div>
                <div className="settings-card">
                  <button className="settings-action-btn edit-btn" onClick={() => navigate("/profile")}>
                    ✏️ Edit Profile
                  </button>
                  <button className="settings-action-btn logout-btn" onClick={handleLogout}>
                    🚪 Log Out
                  </button>
                </div>
              </div>
            )}

            {activeSection === "notifications" && (
              <div className="settings-section">
                <h3>Notification Preferences</h3>
                <p className="settings-section-desc">Choose what notifications you receive</p>
                <div className="settings-card">
                  <div className="settings-toggle-row">
                    <div>
                      <div className="toggle-label">Like Notifications</div>
                      <div className="toggle-desc">Get notified when someone likes your post</div>
                    </div>
                    <button
                      className={`toggle-switch ${notifLikes ? "on" : ""}`}
                      onClick={() => setNotifLikes(!notifLikes)}
                    >
                      <div className="toggle-knob"></div>
                    </button>
                  </div>
                  <div className="settings-toggle-row">
                    <div>
                      <div className="toggle-label">Comment Notifications</div>
                      <div className="toggle-desc">Get notified when someone comments</div>
                    </div>
                    <button
                      className={`toggle-switch ${notifComments ? "on" : ""}`}
                      onClick={() => setNotifComments(!notifComments)}
                    >
                      <div className="toggle-knob"></div>
                    </button>
                  </div>
                  <div className="settings-toggle-row">
                    <div>
                      <div className="toggle-label">Follow Notifications</div>
                      <div className="toggle-desc">Get notified when someone follows you</div>
                    </div>
                    <button
                      className={`toggle-switch ${notifFollows ? "on" : ""}`}
                      onClick={() => setNotifFollows(!notifFollows)}
                    >
                      <div className="toggle-knob"></div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "privacy" && (
              <div className="settings-section">
                <h3>Privacy & Security</h3>
                <p className="settings-section-desc">Control your privacy settings</p>
                <div className="settings-card">
                  <div className="settings-toggle-row">
                    <div>
                      <div className="toggle-label">Private Account</div>
                      <div className="toggle-desc">Only approved followers can see your posts</div>
                    </div>
                    <button
                      className={`toggle-switch ${privateAccount ? "on" : ""}`}
                      onClick={() => setPrivateAccount(!privateAccount)}
                    >
                      <div className="toggle-knob"></div>
                    </button>
                  </div>
                  <div className="settings-toggle-row">
                    <div>
                      <div className="toggle-label">Show Activity Status</div>
                      <div className="toggle-desc">Let others see when you're online</div>
                    </div>
                    <button
                      className={`toggle-switch ${showActivity ? "on" : ""}`}
                      onClick={() => setShowActivity(!showActivity)}
                    >
                      <div className="toggle-knob"></div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "appearance" && (
              <div className="settings-section">
                <h3>Appearance</h3>
                <p className="settings-section-desc">Customize how SocialSnap looks</p>
                <div className="settings-card">
                  <div className="settings-toggle-row">
                    <div>
                      <div className="toggle-label">Dark Mode</div>
                      <div className="toggle-desc">Use dark theme (recommended)</div>
                    </div>
                    <button
                      className={`toggle-switch ${darkMode ? "on" : ""}`}
                      onClick={() => setDarkMode(!darkMode)}
                    >
                      <div className="toggle-knob"></div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "about" && (
              <div className="settings-section">
                <h3>About SocialSnap</h3>
                <p className="settings-section-desc">App information</p>
                <div className="settings-card about-card">
                  <div className="about-logo">📸</div>
                  <h4>SocialSnap</h4>
                  <p className="about-version">Version 1.0.0</p>
                  <p className="about-desc">
                    A premium social media application built with React and Firebase.
                    Share moments, connect with friends, and discover amazing content.
                  </p>
                  <div className="about-links">
                    <span>Privacy Policy</span>
                    <span>•</span>
                    <span>Terms of Service</span>
                    <span>•</span>
                    <span>Help Center</span>
                  </div>
                  <p className="about-copyright">© 2026 SocialSnap. All rights reserved.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
