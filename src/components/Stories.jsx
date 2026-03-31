import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  createStory,
  listenToStories,
  viewStory,
  getAvatarColor,
  getAvatarUrl,
  timeAgo
} from "../App.js";
import ImageModal from "./ImageModal";
import "./Stories.css";

export default function Stories() {
  const { currentUser } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newStoryImg, setNewStoryImg] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activeStory, setActiveStory] = useState(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);
  const storyTimerRef = useRef(null);

  // Listen to stories (already grouped by user in App.js)
  useEffect(() => {
    const unsub = listenToStories((groupedStories) => {
      setStories(groupedStories);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Sort groups: current user first, then by latest update
  const storyGroups = [...stories].sort((a, b) => {
    if (a.userId === currentUser?.uid) return -1;
    if (b.userId === currentUser?.uid) return 1;
    return (b.latestAt || 0) - (a.latestAt || 0);
  });

  // Check if current user has a story
  const currentUserStoryGroup = storyGroups.find(g => g.userId === currentUser?.uid);


  // Story Viewer Logic
  useEffect(() => {
    if (activeStory && activeStory.currentStory) {
      setProgress(0);
      const duration = 5000; // 5 seconds per story
      const interval = 50;
      const step = 100 / (duration / interval);

      storyTimerRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            handleNextStory();
            return 100;
          }
          return prev + step;
        });
      }, interval);

      // Mark as viewed
      if (currentUser && activeStory.currentStory && activeStory.group) {
        try {
          viewStory(activeStory.group.userId, activeStory.currentStory.id, currentUser.uid);
        } catch (e) {
          console.error("Error marking story as viewed:", e);
        }
      }
    }
    return () => clearInterval(storyTimerRef.current);
  }, [activeStory, currentUser]);

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { alert("File too large (max 5MB)"); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setNewStoryImg(ev.target.result);
        setPreview(ev.target.result);
        setShowCreate(true);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handlePostStory() {
    if (!newStoryImg) return;
    setUploading(true);
    try {
      await createStory(currentUser.uid, newStoryImg, "");
      setShowCreate(false);
      setNewStoryImg(null);
      setPreview(null);
    } catch (err) {
      console.error("Error creating story:", err);
      alert("Failed to post story");
    } finally {
      setUploading(false);
    }
  }

  function openStory(group, index = 0) {
    setActiveStory({
      group,
      msgIndex: index,
      currentStory: group.stories[index]
    });
  }

  function handleNextStory() {
    if (!activeStory) return;
    const { group, msgIndex } = activeStory;
    if (msgIndex < group.stories.length - 1) {
      // Next story in same group
      setActiveStory({
        ...activeStory,
        msgIndex: msgIndex + 1,
        currentStory: group.stories[msgIndex + 1]
      });
    } else {
      // Next user group
      const currentGroupIndex = storyGroups.indexOf(group);
      if (currentGroupIndex < storyGroups.length - 1) {
        openStory(storyGroups[currentGroupIndex + 1]);
      } else {
        closeStory();
      }
    }
  }

  function handlePrevStory() {
    if (!activeStory) return;
    const { group, msgIndex } = activeStory;
    if (msgIndex > 0) {
      setActiveStory({
        ...activeStory,
        msgIndex: msgIndex - 1,
        currentStory: group.stories[msgIndex - 1]
      });
    } else {
      const currentGroupIndex = storyGroups.indexOf(group);
      if (currentGroupIndex > 0) {
        const prevGroup = storyGroups[currentGroupIndex - 1];
        openStory(prevGroup, prevGroup.stories.length - 1);
      } else {
        closeStory();
      }
    }
  }

  function closeStory() {
    setActiveStory(null);
    clearInterval(storyTimerRef.current);
  }

  return (
    <div className="stories-container">
      {/* Create Story Button */}
      <div className="story-item create" onClick={() => fileInputRef.current?.click()}>
        <div className="story-preview-wrap">
           {currentUser?.photoURL ? (
             <img src={currentUser.photoURL} alt="Your profile" className="story-preview-img blur" />
           ) : (
             <div className="story-preview-placeholder" style={{background: getAvatarColor(currentUser?.displayName || "User")}}></div>
           )}
           <div className="story-plus-badge">+</div>
        </div>
        <span className="story-username">You</span>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{display: 'none'}} />
      </div>

      {/* Story List */}
      {storyGroups && storyGroups.length > 0 ? (
        storyGroups.map((group) => {
          if (!group || !group.userId || !group.stories || group.stories.length === 0) return null;
          if (group.userId === currentUser?.uid) return null;
          
          const hasUnseen = group.stories.some(s => !s.views?.[currentUser?.uid]);
          const latestStory = group.stories[group.stories.length - 1];
          const profile = group.profile || { displayName: "User", photoURL: null };

          return (
            <div key={group.userId} className={`story-item ${hasUnseen ? "unseen" : "seen"}`} onClick={() => openStory(group)}>
              <div className="story-preview-wrap">
                <div className="story-ring"></div>
                {latestStory && latestStory.imageUrl ? (
                  <img 
                    src={latestStory.imageUrl} 
                    alt={profile.displayName} 
                    className="story-preview-img" 
                    onError={(e) => {
                      e.target.onerror = null; 
                      e.target.src = "https://ui-avatars.com/api/?name=Story&background=random&color=fff";
                    }}
                  />
                ) : (
                  <div className="story-preview-placeholder" style={{background: getAvatarColor(profile.displayName)}}></div>
                )}
                <div className="story-avatar-small">
                   {profile && getAvatarUrl(profile) ? (
                     <img src={getAvatarUrl(profile)} alt={profile.displayName} />
                   ) : (
                     <div className="story-avatar-letter" style={{background: getAvatarColor(profile.displayName)}}>{(profile.displayName || "U")[0]}</div>
                   )}
                </div>
              </div>
              <span className="story-username">{profile.displayName?.split(" ")[0] || "User"}</span>
            </div>
          );
        })
      ) : null}

      {/* Create Story Modal */}
      {showCreate && (
        <div className="story-modal-overlay">
          <div className="create-story-modal">
            <div className="create-story-header">
              <h3>Create Story</h3>
              <button onClick={() => { setShowCreate(false); setNewStoryImg(null); }}>×</button>
            </div>
            <div className="create-story-preview">
              {preview && <img src={preview} alt="Preview" />}
            </div>
            <button className="create-story-btn" onClick={handlePostStory} disabled={uploading}>
              {uploading ? "Posting..." : "Share to Story"}
            </button>
          </div>
        </div>
      )}

      {/* View Story Modal */}
      {activeStory && activeStory.group && activeStory.currentStory && (
        <div className="story-viewer-overlay">
          <button className="story-close-btn" onClick={closeStory}>×</button>
          
          <div className="story-viewer-content">
            {/* Progress Bars */}
            <div className="story-progress-container">
              {activeStory.group.stories && activeStory.group.stories.map((item, idx) => (
                <div key={item.id} className="story-progress-bar-bg">
                  <div
                    className="story-progress-bar-fill"
                    style={{
                      width: idx < activeStory.msgIndex ? "100%" : idx === activeStory.msgIndex ? `${progress}%` : "0%"
                    }}
                  ></div>
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="story-viewer-header">
               <div className="story-viewer-user">
                 {activeStory.group.profile && getAvatarUrl(activeStory.group.profile) ? (
                    <img src={getAvatarUrl(activeStory.group.profile)} alt="" className="story-viewer-avatar" />
                 ) : (
                    <div className="story-viewer-avatar-letter" style={{background: getAvatarColor(activeStory.group.profile?.displayName || "User")}}>
                      {(activeStory.group.profile?.displayName || "U")[0]}
                    </div>
                 )}
                 <span className="story-viewer-name">{activeStory.group.profile?.displayName || "User"}</span>
                 <span className="story-viewer-time">{timeAgo(activeStory.currentStory?.createdAt)}</span>
               </div>
            </div>

            {/* Media */}
            <div className="story-media-container" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              if (x < rect.width / 3) handlePrevStory();
              else handleNextStory();
            }}>
              {activeStory.currentStory?.imageUrl ? (
                <img 
                  src={activeStory.currentStory.imageUrl} 
                  alt="Story" 
                  className="story-main-img" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://via.placeholder.com/400x600?text=Image+Error`;
                  }}
                />
              ) : (
                <div className="story-main-img" style={{background: "#333", display: "flex", alignItems: "center", justifyContent: "center", color: "#999"}}>
                  Image not available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
