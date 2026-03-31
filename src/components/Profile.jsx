import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  listenToUserPosts,
  // listenToPosts, // specific liked posts listener used instead
  listenToLikedPosts,
  getAvatarColor,
  getAvatarUrl,
  listenToUserProfile,
  updateUserProfile,
  listenToSavedPosts,
  followUser,
  unfollowUser,
  listenToIsFollowing,
  listenToFollowers,
  listenToFollowing,
  trackProfileView,
  getUserPostsCache,
} from "../App.js";
import { resizeImage } from "../utils/imageUtils";
import Navbar from "./Navbar";
import PostCard from "./PostCard";
import ImageModal from "./ImageModal";
import "./Profile.css";

export default function Profile() {
  const { userId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isOwnProfile = currentUser && (!userId || userId === currentUser.uid);
  const targetUserId = userId || currentUser?.uid;

  const initialTab = searchParams.get("tab");

  const [userProfile, setUserProfile] = useState(null);
  // Lazy init from cache (safe check)
  const [posts, setPosts] = useState(() => {
    if (typeof getUserPostsCache === 'function' && targetUserId) {
      return getUserPostsCache(targetUserId) || [];
    }
    return [];
  });
  
  const [likedPosts, setLikedPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [activeTab, setActiveTab] = useState(initialTab === "saved" || initialTab === "liked" ? initialTab : "posts");
  
  const [loading, setLoading] = useState(() => {
    if (typeof getUserPostsCache === 'function' && targetUserId) {
      return !getUserPostsCache(targetUserId);
    }
    return true;
  });
  
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followersLoaded, setFollowersLoaded] = useState(false);
  const [followingLoaded, setFollowingLoaded] = useState(false);

  // editing / UI state
  const [editBio, setEditBio] = useState("");
  const [editName, setEditName] = useState("");
  const [editPhoto, setEditPhoto] = useState("");
  const [editCover, setEditCover] = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // follow / followers state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // notifications for liked/post loading
  const [likedLoaded, setLikedLoaded] = useState(false);

  // modal / view state
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState(null);

  // refs for file inputs
  const profileFileRef = useRef();
  const coverFileRef = useRef();

  // Listen to user profile
  useEffect(() => {
    if (!targetUserId) return;
    setProfileLoaded(false);
    const unsub = listenToUserProfile(targetUserId, (profile) => {
      if (profile) {
        setUserProfile(profile);
        setEditBio(profile.bio || "");
        setEditName(profile.displayName || "");
        setEditPhoto(profile.photoURL || "");
        setEditCover(profile.coverURL || "");
      } else if (isOwnProfile && currentUser) {
        setUserProfile({
          uid: targetUserId,
          displayName: currentUser.displayName,
          email: currentUser.email,
          bio: "📸 SocialSnap user",
        });
      }
      setProfileLoaded(true);
    });
    return () => unsub();
  }, [targetUserId, isOwnProfile, currentUser]);

  // Listen to user's posts
  useEffect(() => {
    if (!targetUserId) {
      setLoading(false); 
      return;
    }

    if (typeof getUserPostsCache === 'function' && !getUserPostsCache(targetUserId)) {
      setLoading(true);
    }
    
    const unsub = listenToUserPosts(targetUserId, (userPosts) => {
      setPosts(userPosts);
      setLoading(false);
    });
    return () => unsub();
  }, [targetUserId]);

  // Lazy load liked posts
  // Lazy load liked posts (Optimized)
  useEffect(() => {
    if (!targetUserId || activeTab !== "liked") return;
    
    // Check if we already have them or if we need to load
    // efficient listener that only fetches liked posts
    setLoading(true);
    const unsub = listenToLikedPosts(targetUserId, (liked) => {
      setLikedPosts(liked);
      setLikedLoaded(true);
      setLoading(false);
    });
    return () => unsub();
  }, [activeTab, targetUserId]);

  // Reset states when target user changes to avoid flickering old data
  useEffect(() => {
    if (!targetUserId) return;
    setFollowers([]);
    setFollowing([]);
    setFollowersLoaded(false);
    setFollowingLoaded(false);
    setPosts([]);
    setIsFollowing(false);
    setLoading(true);
  }, [targetUserId]);
  useEffect(() => {
    if (!currentUser || !isOwnProfile || activeTab !== "saved") return;
    const unsub = listenToSavedPosts(currentUser.uid, setSavedPosts);
    return () => unsub();
  }, [isOwnProfile, currentUser, activeTab]);

  // Follow state listener
  useEffect(() => {
    if (isOwnProfile || !currentUser) return;
    const unsub = listenToIsFollowing(currentUser.uid, targetUserId, setIsFollowing);
    return () => unsub();
  }, [isOwnProfile, currentUser, targetUserId]);

  // Followers & Following lists
  useEffect(() => {
    if (!targetUserId) return;
    const unsub1 = listenToFollowers(targetUserId, (list) => {
       setFollowers(list);
       setFollowersLoaded(true);
    });
    const unsub2 = listenToFollowing(targetUserId, (list) => {
       setFollowing(list);
       setFollowingLoaded(true);
    });
    return () => { unsub1(); unsub2(); };
  }, [targetUserId]);

  // Track profile view (once per visit)
  useEffect(() => {
    if (!isOwnProfile && currentUser) {
      trackProfileView(currentUser.uid, targetUserId);
    }
  }, [targetUserId, isOwnProfile, currentUser]);

  const totalLikes = useMemo(() => {
    if (!posts || posts.length === 0) return 0;
    return posts.reduce((sum, p) => sum + (p.likes?.length || 0), 0);
  }, [posts]);

  const totalComments = useMemo(() => {
    if (!posts || posts.length === 0) return 0;
    return posts.reduce((sum, p) => sum + (p.comments?.length || 0), 0);
  }, [posts]);

  // stats counts
  const displayPostsCount = posts.length || userProfile?.postsCount || 0;
  const displayFollowersCount = followersLoaded ? followers.length : (userProfile?.followersCount || 0);
  const displayFollowingCount = followingLoaded ? following.length : (userProfile?.followingCount || 0);
  const displayLikesCount = totalLikes > 0 ? totalLikes : (userProfile?.totalLikes || 0);

  const avatarUrl = getAvatarUrl(userProfile);
  const displayName = userProfile?.displayName || "User";
  const coverUrl = userProfile?.coverURL || null;

  async function handleFollow() {
    setFollowLoading(true);

    // Optimistic Update
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    
    // Update follower count strictly for UI appearance (approximate)
    if (wasFollowing) {
      setFollowers(prev => prev.filter(u => u.uid !== currentUser.uid));
    } else {
      // Add fake self to followers list temporarily
      setFollowers(prev => [...prev, { uid: currentUser.uid, displayName: currentUser.displayName, photoURL: currentUser.photoURL }]);
    }

    try {
      if (wasFollowing) {
        await unfollowUser(currentUser.uid, targetUserId);
      } else {
        await followUser(currentUser.uid, targetUserId);
      }
    } catch (err) {
      console.error("Follow error:", err);
      // Revert
      setIsFollowing(wasFollowing);
      // Revert followers list not strictly necessary as it will receive real-time update, 
      // but good practice if real-time is slow.
    } finally {
      setFollowLoading(false);
    }
  }

  // File handlers
  async function handleProfileFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please select an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { alert("Image must be less than 2MB"); return; }
    try {
      // Resize to max 300x300 for avatar (performance optimization)
      const dataUrl = await resizeImage(file, 300, 300, 0.8);
      setPhotoPreview(dataUrl);
      setEditPhoto(dataUrl);
    } catch (err) {
      console.error("Error processing image:", err);
      alert("Failed to process image. please try another one.");
    }
  }

  async function handleCoverFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please select an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { alert("Image must be less than 2MB"); return; }
    try {
      // Resize to max 1200x600 for cover (performance optimization)
      const dataUrl = await resizeImage(file, 1200, 600, 0.8);
      setCoverPreview(dataUrl);
      setEditCover(dataUrl);
    } catch (err) {
      console.error("Error processing image:", err);
      alert("Failed to process cover image.");
    }
  }

  async function handleSaveProfile() {
    setSaving(true);
    try {
      const updates = {
        displayName: editName.trim() || displayName,
        bio: editBio.trim(),
        photoURL: editPhoto.trim() || null,
        coverURL: editCover.trim() || null,
      };
      await updateUserProfile(targetUserId, updates);
      setIsEditing(false);
      setPhotoPreview(null);
      setCoverPreview(null);
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setPhotoPreview(null);
    setCoverPreview(null);
    setEditBio(userProfile?.bio || "");
    setEditName(userProfile?.displayName || "");
    setEditPhoto(userProfile?.photoURL || "");
    setEditCover(userProfile?.coverURL || "");
  }

  const displayPosts = useMemo(() => {
    if (activeTab === "posts") return posts;
    if (activeTab === "liked") return likedPosts;
    if (activeTab === "saved") return savedPosts;
    return [];
  }, [activeTab, posts, likedPosts, savedPosts]);

  return (
    <div className="profile-page">
      <Navbar />
      <main className="profile-main">
        {/* Cover Photo */}
        <div className="profile-cover">
          {coverPreview ? (
            <img src={coverPreview} alt="Cover preview" className="cover-image" />
          ) : coverUrl ? (
            <img src={coverUrl} alt="Cover" className="cover-image" loading="lazy" />
          ) : (
            <>
              <div className="cover-gradient-bg"></div>
              <div className="cover-pattern"></div>
            </>
          )}
          {isEditing && isOwnProfile && (
            <button className="cover-upload-btn" onClick={() => coverFileRef.current?.click()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              Change Cover
            </button>
          )}
          <input ref={coverFileRef} type="file" accept="image/*" onChange={handleCoverFileSelect} style={{ display: "none" }} />
        </div>

        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-header-inner">
            <div className="profile-avatar-section">
              {!profileLoaded ? (
                <div className="profile-avatar-skeleton"></div>
              ) : isEditing && isOwnProfile ? (
                <div className="avatar-upload-wrap" onClick={() => profileFileRef.current?.click()}>
                  {photoPreview || editPhoto ? (
                    <img src={photoPreview || editPhoto} alt={displayName} className="profile-avatar-large-img editing" />
                  ) : (
                    <div className="profile-avatar-large editing" style={{ background: getAvatarColor(displayName) }}>
                      {displayName[0].toUpperCase()}
                    </div>
                  )}
                  <div className="avatar-upload-overlay">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    <span>Change Photo</span>
                  </div>
                </div>
              ) : (
                <>
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="profile-avatar-large-img"
                      onClick={() => setViewingPhoto(avatarUrl)}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="profile-avatar-large"
                      style={{ background: getAvatarColor(displayName) }}
                    >
                      {displayName[0].toUpperCase()}
                    </div>
                  )}
                </>
              )}
              <input ref={profileFileRef} type="file" accept="image/*" onChange={handleProfileFileSelect} style={{ display: "none" }} />
            </div>

            <div className="profile-info">
              {!profileLoaded ? (
                <div className="profile-info-skeleton">
                  <div className="skeleton-line-profile w60"></div>
                  <div className="skeleton-line-profile w40"></div>
                  <div className="skeleton-line-profile w80"></div>
                </div>
              ) : isEditing ? (
                <div className="edit-form">
                  <div className="edit-field-group">
                    <label className="edit-label">Display Name</label>
                    <input className="edit-input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Display Name" />
                  </div>
                  <div className="edit-field-group">
                    <label className="edit-label">Bio</label>
                    <textarea className="edit-textarea" value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Tell us about yourself..." rows={2} />
                  </div>
                  <div className="edit-field-group">
                    <label className="edit-label">Profile Photo URL (or upload above)</label>
                    <input
                      className="edit-input"
                      value={photoPreview ? "(Uploaded from device)" : editPhoto}
                      onChange={(e) => { setEditPhoto(e.target.value); setPhotoPreview(null); }}
                      placeholder="https://example.com/photo.jpg"
                      disabled={!!photoPreview}
                    />
                  </div>
                  <div className="edit-actions">
                    <button className="edit-save-btn" onClick={handleSaveProfile} disabled={saving}>
                      {saving ? (<><span className="spinner-small"></span> Saving...</>) : "Save Changes"}
                    </button>
                    <button className="edit-cancel-btn" onClick={handleCancelEdit}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="profile-display-name">{displayName}</h1>
                  <p className="profile-email">{userProfile?.email}</p>
                  <p className="profile-bio">{userProfile?.bio || "📸 SocialSnap user"}</p>
                </>
              )}
            </div>

            {isOwnProfile ? (
              !isEditing && (
                <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edit Profile
                </button>
              )
            ) : (
              <button
                className={`follow-profile-btn ${isFollowing ? "following" : ""}`}
                onClick={handleFollow}
                disabled={followLoading}
              >
                {followLoading ? <span className="spinner-small"></span> : isFollowing ? "Following ✓" : "Follow"}
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="profile-stats-bar">
            <div className="profile-stat" onClick={() => setActiveTab("posts")}>
              <span className="profile-stat-number">{displayPostsCount}</span>
              <span className="profile-stat-label">Posts</span>
            </div>
            <div className="profile-stat clickable" onClick={() => setShowFollowersModal(true)}>
              <span className="profile-stat-number">{displayFollowersCount}</span>
              <span className="profile-stat-label">Followers</span>
            </div>
            <div className="profile-stat clickable" onClick={() => setShowFollowingModal(true)}>
              <span className="profile-stat-number">{displayFollowingCount}</span>
              <span className="profile-stat-label">Following</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-number">{displayLikesCount}</span>
              <span className="profile-stat-label">Likes</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="profile-tabs">
            <button className={`profile-tab ${activeTab === "posts" ? "active" : ""}`} onClick={() => setActiveTab("posts")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              Posts
            </button>
            <button className={`profile-tab ${activeTab === "liked" ? "active" : ""}`} onClick={() => setActiveTab("liked")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              Liked
            </button>
            {isOwnProfile && (
              <button className={`profile-tab ${activeTab === "saved" ? "active" : ""}`} onClick={() => setActiveTab("saved")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
                Saved
              </button>
            )}
          </div>
        </div>

        {/* Posts Content */}
        <div className="profile-content">
          {loading && activeTab === "posts" && posts.length === 0 ? (
            <div className="profile-loading">
              <div className="profile-skeleton-posts">
                {[1, 2].map((i) => (
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : displayPosts.length === 0 ? (
            <div className="profile-empty">
              <span className="profile-empty-icon">{activeTab === "posts" ? "📝" : activeTab === "liked" ? "❤️" : "🏷️"}</span>
              <h3>No {activeTab} yet</h3>
              <p>
                {activeTab === "posts"
                  ? isOwnProfile ? "Share your first moment!" : "This user hasn't posted yet."
                  : activeTab === "liked" ? "Posts you like will show up here."
                  : "Save posts to watch them later."}
              </p>
              {activeTab === "posts" && isOwnProfile && (
                <button className="create-first-post-btn" onClick={() => navigate("/")}>Create Post</button>
              )}
            </div>
          ) : (
            <div className="profile-posts">
              {displayPosts.map((post) => <PostCard key={post.id} post={post} />)}
            </div>
          )}
        </div>
      </main>

      {/* Followers Modal */}
      {showFollowersModal && (
        <div className="follow-modal-overlay" onClick={() => setShowFollowersModal(false)}>
          <div className="follow-modal" onClick={(e) => e.stopPropagation()}>
            <div className="follow-modal-header">
              <h3>Followers</h3>
              <button onClick={() => setShowFollowersModal(false)}>×</button>
            </div>
            <div className="follow-modal-list">
              {followers.length === 0 ? (
                <div className="follow-modal-empty">No followers yet</div>
              ) : (
                followers.map((user) => (
                  <div key={user.uid} className="follow-modal-user" onClick={() => { setShowFollowersModal(false); navigate(`/profile/${user.uid}`); }}>
                    {getAvatarUrl(user) ? (
                      <img src={getAvatarUrl(user)} alt="" className="follow-modal-avatar" />
                    ) : (
                      <div className="follow-modal-avatar-letter" style={{ background: getAvatarColor(user.displayName) }}>
                        {(user.displayName || "U")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="follow-modal-info">
                      <span className="follow-modal-name">{user.displayName}</span>
                      <span className="follow-modal-bio">{user.bio || "📸 SocialSnap user"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <div className="follow-modal-overlay" onClick={() => setShowFollowingModal(false)}>
          <div className="follow-modal" onClick={(e) => e.stopPropagation()}>
            <div className="follow-modal-header">
              <h3>Following</h3>
              <button onClick={() => setShowFollowingModal(false)}>×</button>
            </div>
            <div className="follow-modal-list">
              {following.length === 0 ? (
                <div className="follow-modal-empty">Not following anyone</div>
              ) : (
                following.map((user) => (
                  <div key={user.uid} className="follow-modal-user" onClick={() => { setShowFollowingModal(false); navigate(`/profile/${user.uid}`); }}>
                    {getAvatarUrl(user) ? (
                      <img src={getAvatarUrl(user)} alt="" className="follow-modal-avatar" />
                    ) : (
                      <div className="follow-modal-avatar-letter" style={{ background: getAvatarColor(user.displayName) }}>
                        {(user.displayName || "U")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="follow-modal-info">
                      <span className="follow-modal-name">{user.displayName}</span>
                      <span className="follow-modal-bio">{user.bio || "📸 SocialSnap user"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {viewingPhoto && <ImageModal src={viewingPhoto} alt={displayName} onClose={() => setViewingPhoto(null)} />}
    </div>
  );
}
