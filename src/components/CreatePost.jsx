import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { createPost, getAvatarColor, listenToUserProfile } from "../App.js";
import { resizeImage } from "../utils/imageUtils";
import "./CreatePost.css";

export default function CreatePost() {
  const { currentUser } = useAuth();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeMood, setActiveMood] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [dbProfile, setDbProfile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'image' or 'video'
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Fetch real user profile photo from DB
  useEffect(() => {
    if (currentUser) {
      const unsub = listenToUserProfile(currentUser.uid, (profile) => {
        setDbProfile(profile);
      });
      return () => unsub();
    }
  }, [currentUser]);

  const userPhoto = dbProfile?.photoURL || null;
  const moods = ["😊 Happy", "🎉 Excited", "😴 Tired", "😤 Angry", "🤔 Thinking", "🥰 Loved", "💪 Motivated"];

  async function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // Increased limit since we resize
      setError("Image must be under 5MB");
      return;
    }
    
    try {
      // Resize post images to max 1000x1000
      const dataUrl = await resizeImage(file, 1000, 1000, 0.8);
      setMediaPreview(dataUrl);
      setMediaType("image");
      setIsExpanded(true);
      setError("");
    } catch (err) {
      console.error("Error processing image:", err);
      setError("Failed to process image");
    }
  }

  function handleVideoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("Please select a video file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Video must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setMediaPreview(ev.target.result);
      setMediaType("video");
      setIsExpanded(true);
      setError("");
    };
    reader.readAsDataURL(file);
  }

  function removeMedia() {
    setMediaPreview(null);
    setMediaType(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim() && !mediaPreview) return;

    try {
      setError("");
      setLoading(true);
      const postContent = activeMood ? `${activeMood} - ${content}` : content;
      await createPost(postContent, mediaPreview);
      setContent("");
      setActiveMood("");
      setMediaPreview(null);
      setMediaType(null);
      setIsExpanded(false);
      setMediaType(null);
      setIsExpanded(false);
    } catch (err) {
      console.error("Create Post Error:", err);
      setError(err.message || "Failed to create post. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`create-post-card ${isExpanded ? "expanded" : ""}`}>
      {error && <div className="create-post-error">{error}</div>}
      
      <div className="create-post-top">
        <div className="create-post-avatar">
          {userPhoto ? (
             <img src={userPhoto} alt="Me" className="create-post-avatar-img" />
          ) : (
            <div
              className="create-post-avatar-placeholder"
              style={{ background: getAvatarColor(currentUser.displayName) }}
            >
              {(currentUser.displayName || "U")[0].toUpperCase()}
            </div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="create-post-form">
          <textarea
            placeholder={`What's on your mind, ${currentUser.displayName?.split(" ")[0] || "User"}?`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            rows={isExpanded ? 3 : 1}
          />
        </form>
      </div>

      {/* Media Preview */}
      {mediaPreview && (
        <div className="media-preview-container">
          {mediaType === "image" ? (
            <img src={mediaPreview} alt="Preview" className="media-preview-img" />
          ) : (
            <video src={mediaPreview} className="media-preview-video" controls muted />
          )}
          <button className="media-remove-btn" onClick={removeMedia}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {isExpanded && (
        <div className="create-post-expanded-content">
          <div className="mood-tags">
            {moods.map((mood) => (
              <button
                key={mood}
                className={`mood-tag ${activeMood === mood ? "active" : ""}`}
                onClick={() => setActiveMood(activeMood === mood ? "" : mood)}
              >
                {mood}
              </button>
            ))}
          </div>
          
          <div className="create-post-actions">
            <div className="action-icons">
              <button className="icon-btn" title="Add Photo" onClick={() => imageInputRef.current?.click()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span className="icon-btn-label">Photo</span>
              </button>
              <button className="icon-btn" title="Add Video" onClick={() => videoInputRef.current?.click()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                <span className="icon-btn-label">Video</span>
              </button>
              <button className="icon-btn" title="GIF">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><text x="5" y="16" fontSize="10" fill="currentColor" stroke="none" fontWeight="700">GIF</text></svg>
                <span className="icon-btn-label">GIF</span>
              </button>
              <button className="icon-btn" title="Poll">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                <span className="icon-btn-label">Poll</span>
              </button>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: "none" }}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoSelect}
              style={{ display: "none" }}
            />
            
            <div className="submit-area">
              <span className={`char-count ${content.length > 200 ? "limit" : ""}`}>
                {content.length}/280
              </span>
              <button
                className="post-submit-btn" 
                onClick={handleSubmit} 
                disabled={(!content.trim() && !mediaPreview) || loading}
              >
                {loading ? (
                  <><span className="btn-spinner"></span> Posting...</>
                ) : (
                  "Post"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
