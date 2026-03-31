import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  likePost,
  unlikePost,
  deletePost,
  addComment,
  addCommentWithNotification,
  deleteComment,
  timeAgo,
  getAvatarColor,
  getAvatarUrl,
  getCachedProfile,
  ensureProfileLoaded,
  savePost,
  unsavePost,
  listenToIsSaved,
  prefetchUserPosts,
} from "../App.js";
import ImageModal from "./ImageModal";
import "./PostCard.css";

export default function PostCard({ post }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [authorPhoto, setAuthorPhoto] = useState(null);
  const [imageModal, setImageModal] = useState(null);
  const lastTap = useRef(0);

  const isLiked = currentUser && post.likes?.includes(currentUser.uid);
  const isOwner = currentUser && post.authorId === currentUser.uid;

  // Use cached profile first for instant display
  useEffect(() => {
    const cached = getCachedProfile(post.authorId);
    if (cached?.photoURL) {
      setAuthorPhoto(cached.photoURL);
    } else {
      ensureProfileLoaded(post.authorId).then((profile) => {
        if (profile?.photoURL) setAuthorPhoto(profile.photoURL);
      });
    }

    if (currentUser) {
      const unsub = listenToIsSaved(currentUser.uid, post.id, setIsBookmarked);
      return () => unsub();
    }
  }, [post.authorId, currentUser, post.id]);

  function handleDoubleTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!isLiked) handleLike();
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 1000);
    }
    lastTap.current = now;
  }

  async function handleLike() {
    try {
      if (isLiked) await unlikePost(post.id, currentUser.uid, post.authorId);
      else await likePost(post.id, currentUser.uid, post.authorId, post.content);
    } catch (err) { console.error("Error toggling like:", err); }
  }

  async function handleComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      // Use the new function that handles notifications
      // addComment is still available but doesn't notify
      // We need to import addCommentWithNotification or just update addComment to support it?
      // I added addCommentWithNotification in App.js. Let's use that if I can import it, 
      // or better, I should have just updated addComment to take optional args.
      // Let's assume I will update the import in PostCard.jsx to include addCommentWithNotification
      // and use it here.
      // Wait, I didn't update the import yet. I need to do that too.
      // actually, for now let's just use addCommentWithNotification if I can.
      await addCommentWithNotification(post.id, commentText, post.authorId, post.content);
      setCommentText("");
    } catch (err) { console.error("Error adding comment:", err); }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try { await deletePost(post.id); }
    catch (err) { console.error("Error deleting post:", err); setIsDeleting(false); }
  }

  async function handleDeleteComment(comment) {
    try { await deleteComment(post.id, comment.id); }
    catch (err) { console.error("Error deleting comment:", err); }
  }

  function handleShare() {
    setIsShared(true);
    setTimeout(() => setIsShared(false), 2000);
    if (navigator.share) {
      navigator.share({ title: "SocialSnap Post", text: post.content });
    } else {
      navigator.clipboard.writeText(post.content).catch(() => {});
    }
  }

  async function handleBookmark() {
    try {
      if (isBookmarked) await unsavePost(currentUser.uid, post.id);
      else await savePost(currentUser.uid, post.id);
    } catch (err) { console.error("Error toggling bookmark:", err); }
  }

  function goToProfile(userId) {
    // warm up data before redirecting
    prefetchUserPosts(userId).catch(() => {});
    navigate(`/profile/${userId}`);
  }

  return (
    <div className={`post-card ${isDeleting ? "deleting" : ""}`}>
      {/* Post Header */}
      <div className="post-header">
        <div className="post-author" onClick={() => goToProfile(post.authorId)}>
          <div className="post-avatar-ring">
            {authorPhoto ? (
              <img src={authorPhoto} alt={post.authorName} className="post-avatar-img" loading="lazy" />
            ) : (
              <div className="post-avatar" style={{ background: getAvatarColor(post.authorName) }}>
                {(post.authorName || "A")[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="post-meta">
            <div className="post-meta-top">
              <span className="post-author-name">{post.authorName}</span>
              {isOwner && <span className="author-badge">You</span>}
            </div>
            <span className="post-time">{timeAgo(post.createdAt)}</span>
          </div>
        </div>
        {isOwner && (
          <div className="post-actions-menu">
            {showDeleteConfirm ? (
              <div className="delete-confirm">
                <span>Delete?</span>
                <button className="confirm-yes" onClick={handleDelete}>Yes</button>
                <button className="confirm-no" onClick={() => setShowDeleteConfirm(false)}>No</button>
              </div>
            ) : (
              <button className="more-trigger" onClick={() => setShowDeleteConfirm(true)} title="More options">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Post Content */}
      <div className="post-content" onClick={handleDoubleTap}>
        {post.content && <p>{post.content}</p>}
        {post.imageUrl && (
          <div className="post-media">
            {post.imageUrl.startsWith("data:video") ? (
              <video src={post.imageUrl} className="post-media-video" controls />
            ) : (
              <img
                src={post.imageUrl}
                alt="Post"
                className="post-media-img"
                loading="lazy"
                onClick={(e) => { e.stopPropagation(); setImageModal(post.imageUrl); }}
                style={{ cursor: "zoom-in" }}
              />
            )}
          </div>
        )}
        {showHeartAnim && (
          <div className="heart-animation">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="#ef4444" stroke="none">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
        )}
      </div>

      {/* Post Stats */}
      {(post.likes?.length > 0 || post.comments?.length > 0) && (
        <div className="post-stats">
          {post.likes?.length > 0 && (
            <span className="stat-likes">
              <span className="like-emoji-stack">❤️</span>
              {post.likes.length} {post.likes.length === 1 ? "like" : "likes"}
            </span>
          )}
          {post.comments?.length > 0 && (
            <span className="stat-comments" onClick={() => setShowComments(!showComments)}>
              {post.comments.length} {post.comments.length === 1 ? "comment" : "comments"}
            </span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="post-action-bar">
        <button className={`action-btn like-btn ${isLiked ? "liked" : ""}`} onClick={handleLike}>
          {isLiked ? (
            <svg className="like-icon-filled" width="20" height="20" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          )}
          {isLiked ? "Liked" : "Like"}
        </button>
        <button className="action-btn comment-btn" onClick={() => setShowComments(!showComments)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Comment
        </button>
        <button className={`action-btn share-btn ${isShared ? "shared" : ""}`} onClick={handleShare}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          {isShared ? "Shared!" : "Share"}
        </button>
        <button className={`action-btn bookmark-btn ${isBookmarked ? "bookmarked" : ""}`} onClick={handleBookmark}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={isBookmarked ? "#f59e0b" : "none"} stroke={isBookmarked ? "#f59e0b" : "currentColor"} strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="comments-section">
          {post.comments?.length > 0 && (
            <div className="comments-list">
              {post.comments.map((comment, index) => (
                <div className="comment-item" key={comment.id || index}>
                  <div className="comment-avatar" style={{ background: getAvatarColor(comment.authorName) }} onClick={() => goToProfile(comment.authorId)}>
                    {(comment.authorName || "A")[0].toUpperCase()}
                  </div>
                  <div className="comment-body">
                    <div className="comment-bubble">
                      <span className="comment-author" onClick={() => goToProfile(comment.authorId)}>{comment.authorName}</span>
                      <p className="comment-text">{comment.text}</p>
                    </div>
                    <div className="comment-actions">
                      <span className="comment-time">{new Date(comment.createdAt).toLocaleDateString()}</span>
                      <button className="comment-action-btn" onClick={handleLike}>Like</button>
                      <button className="comment-action-btn" onClick={() => setCommentText(`@${comment.authorName} `)}>Reply</button>
                    </div>
                  </div>
                  {comment.authorId === currentUser.uid && (
                    <button className="comment-delete" onClick={() => handleDeleteComment(comment)} title="Delete comment">×</button>
                  )}
                </div>
              ))}
            </div>
          )}

          <form className="comment-form" onSubmit={handleComment}>
            <div className="comment-form-avatar" style={{ background: getAvatarColor(currentUser.displayName) }}>
              {(currentUser.displayName || currentUser.email)[0].toUpperCase()}
            </div>
            <div className="comment-input-wrap">
              <input
                type="text"
                className="comment-input"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={200}
              />
              <button type="submit" className="comment-send" disabled={!commentText.trim()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Image Modal */}
      {imageModal && <ImageModal src={imageModal} alt="Post image" onClose={() => setImageModal(null)} />}
    </div>
  );
}
