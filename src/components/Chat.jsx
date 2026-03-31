import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  listenToChatList,
  listenToMessages,
  sendMessage,
  markMessagesRead,
  getAvatarColor,
  getAvatarUrl,
  listenToPresence,
  timeAgo,
  getUsersOnce,
  getCachedMessages,
} from "../App.js";
import Navbar from "./Navbar";
import "./Chat.css";

export default function Chat() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [chatList, setChatList] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlineStatus, setOnlineStatus] = useState({});
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [chatListLoading, setChatListLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatCacheKey = currentUser ? `chatListCache_${currentUser.uid}` : null;
  const usersCacheKey = currentUser ? `usersCache_${currentUser.uid}` : null;

  // Listen to chat list
  useEffect(() => {
    if (!currentUser) return;
    // Try to show cached chats instantly for faster UX
    if (chatCacheKey && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(chatCacheKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setChatList(parsed);
            setChatListLoading(false);
          }
        }
      } catch (e) {
        // ignore cache errors
      }
    }
  }, [currentUser, chatCacheKey]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = listenToChatList(currentUser.uid, (list) => {
      setChatList(list);
      setChatListLoading(false);
      if (chatCacheKey && typeof window !== "undefined") {
        try {
          localStorage.setItem(chatCacheKey, JSON.stringify(list));
        } catch (e) {
          // ignore
        }
      }
    });
    return () => {
      unsub();
    };
  }, [currentUser, chatCacheKey]);

  // Load users cache fast (used for user search / new chat)
  useEffect(() => {
    if (!currentUser || !usersCacheKey) return;
    try {
      const raw = localStorage.getItem(usersCacheKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setAllUsers(parsed);
        setUsersLoaded(true);
      }
    } catch (e) {
      // ignore
    }
  }, [currentUser, usersCacheKey]);

  const ensureUsersLoaded = useCallback(async () => {
    if (!currentUser || usersLoaded || usersLoading) return;
    setUsersLoading(true);
    try {
      const users = await getUsersOnce(800);
      const filtered = users.filter(u => u?.uid && u.uid !== currentUser.uid);
      setAllUsers(filtered);
      setUsersLoaded(true);
      if (usersCacheKey) {
        // Store only needed fields (smaller + faster)
        const minimal = filtered.map(u => ({
          uid: u.uid,
          displayName: u.displayName || u.name || "",
          email: u.email || "",
          photoURL: u.photoURL || null,
          bio: u.bio || "",
        }));
        localStorage.setItem(usersCacheKey, JSON.stringify(minimal));
      }
    } catch (e) {
      console.error("Failed to load users:", e);
    } finally {
      setUsersLoading(false);
    }
  }, [currentUser, usersLoaded, usersLoading, usersCacheKey]);

  // Listen to messages for selected chat
  useEffect(() => {
    if (!selectedChat || !currentUser) return;
    const cached = getCachedMessages(currentUser.uid, selectedChat.userId);
    if (cached && cached.length > 0) {
      setMessages(cached);
      setMessagesLoading(false);
    } else {
      setMessages([]);
      setMessagesLoading(true);
    }
    const unsub = listenToMessages(currentUser.uid, selectedChat.userId, (msgs) => {
      setMessages(msgs);
      setMessagesLoading(false);
    });
    markMessagesRead(currentUser.uid, selectedChat.userId);
    return () => {
      unsub();
      setMessages([]);
      setMessagesLoading(false);
    };
  }, [selectedChat, currentUser]);

  // Listen to online status of selected chat user
  useEffect(() => {
    if (!selectedChat) return;
    const unsub = listenToPresence(selectedChat.userId, (presence) => {
      setOnlineStatus(prev => ({ ...prev, [selectedChat.userId]: presence }));
    });
    return () => unsub();
  }, [selectedChat]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat selected
  useEffect(() => {
    if (selectedChat) inputRef.current?.focus();
  }, [selectedChat]);

  async function handleSend(e) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;
    const text = newMessage;
    setNewMessage("");
    
    // Add to chat list optimistically if not present
    setChatList(prev => {
      const exists = prev.find(c => c.userId === selectedChat.userId);
      if (exists) {
        return prev.map(c => c.userId === selectedChat.userId 
          ? { ...c, lastMessage: text, lastMessageTime: Date.now(), lastSenderId: currentUser.uid } 
          : c
        ).sort((a, b) => b.lastMessageTime - a.lastMessageTime);
      } else {
        return [{
          userId: selectedChat.userId,
          profile: selectedChat.profile,
          lastMessage: text,
          lastMessageTime: Date.now(),
          lastSenderId: currentUser.uid
        }, ...prev];
      }
    });

    // Optimistic Message
    const optimisticMsg = {
      id: "temp-" + Date.now(),
      text: text,
      senderId: currentUser.uid,
      timestamp: Date.now(),
      read: false,
      sending: true 
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await sendMessage(currentUser.uid, selectedChat.userId, text);
    } catch (err) {
      console.error("Error sending message:", err);
      // Revert optimistic updates on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      alert("Failed to send message");
    }
  }

  function startNewChat(user) {
    const newChat = {
      userId: user.uid,
      profile: user,
    };
    setSelectedChat(newChat);
    setShowNewChat(false);
    setSearchQuery("");
  }

  // Memoize filtered users to prevent performance issues on every render
  // Limit results to 10 for performance
  const filteredUsers = useMemo(() => {
    if (!searchQuery || !allUsers) return [];
    const q = searchQuery.toLowerCase();
    return allUsers.filter(u => {
      if (!u) return false;
      const name = u.displayName ? String(u.displayName).toLowerCase() : (u.name ? String(u.name).toLowerCase() : "");
      const email = u.email ? String(u.email).toLowerCase() : "";
      return name.includes(q) || email.includes(q);
    }).slice(0, 10); 
  }, [allUsers, searchQuery]);

  const visibleChats = useMemo(() => {
    if (!chatSearch.trim()) return chatList;
    const q = chatSearch.toLowerCase();
    return chatList.filter(chat => {
      if (!chat || !chat.profile) return false;
      const name = chat.profile.displayName ? String(chat.profile.displayName).toLowerCase() : "";
      const email = chat.profile.email ? String(chat.profile.email).toLowerCase() : "";
      return name.includes(q) || email.includes(q);
    });
  }, [chatList, chatSearch]);

  const selectedPresence = selectedChat ? onlineStatus[selectedChat.userId] : null;

  if (!currentUser) return null; // Safety check

  return (
    <div className="chat-page">
      <Navbar />
      <main className="chat-main">
        <div className="chat-layout">
          {/* Chat List Sidebar */}
          <div className={`chat-sidebar ${selectedChat ? "hide-mobile" : ""}`}>
            <div className="chat-sidebar-header">
              <h2>Messages</h2>
              <button className="new-chat-btn" onClick={() => setShowNewChat(true)} title="New Message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>

            {/* Chat search (like Instagram DM search) */}
            <div className="chat-sidebar-search-wrap">
              <input
                type="text"
                placeholder="Search chats..."
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                className="new-chat-search"
              />
            </div>

            {/* New Chat Modal */}
            {showNewChat && (
              <div className="new-chat-dropdown">
                <div className="new-chat-header">
                  <h4>New Message</h4>
                  <button onClick={() => setShowNewChat(false)}>×</button>
                </div>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onFocus={() => { void ensureUsersLoaded(); }}
                  onChange={(e) => { setSearchQuery(e.target.value); void ensureUsersLoaded(); }}
                  className="new-chat-search"
                  autoFocus
                />
                <div className="new-chat-users">
                  {usersLoading && allUsers.length === 0 && (
                    <div className="new-chat-empty">Loading users...</div>
                  )}
                  {filteredUsers.map(user => (
                    <div key={user.uid} className="new-chat-user" onClick={() => startNewChat(user)}>
                      {getAvatarUrl(user) ? (
                        <img src={getAvatarUrl(user)} alt="" className="chat-user-avatar" loading="lazy" />
                      ) : (
                        <div className="chat-user-avatar-letter" style={{ background: getAvatarColor(user.displayName) }}>
                          {(user.displayName && user.displayName.length > 0 ? user.displayName[0] : "U").toUpperCase()}
                        </div>
                      )}
                      <div className="chat-user-info">
                        <span className="chat-user-name">{user.displayName || "Unknown User"}</span>
                        <span className="chat-user-email">{user.email || ""}</span>
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="new-chat-empty">No users found</div>
                  )}
                </div>
              </div>
            )}

            {/* Chat List */}
            <div className="chat-list">
              {chatListLoading && chatList.length === 0 ? (
                <div className="chat-list-loading">
                  <p>Loading chats...</p>
                </div>
              ) : chatList.length === 0 ? (
                <div className="chat-list-empty">
                  <span>💬</span>
                  <p>No messages yet</p>
                  <p>Search for a user to start a conversation</p>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onFocus={() => { void ensureUsersLoaded(); }}
                    onChange={(e) => { setSearchQuery(e.target.value); void ensureUsersLoaded(); }}
                    className="new-chat-search"
                  />
                  <div className="new-chat-users">
                    {usersLoading && allUsers.length === 0 && (
                      <div className="new-chat-empty">Loading users...</div>
                    )}
                    {filteredUsers.map(user => (
                      <div key={user.uid} className="new-chat-user" onClick={() => startNewChat(user)}>
                        {getAvatarUrl(user) ? (
                          <img src={getAvatarUrl(user)} alt="" className="chat-user-avatar" loading="lazy" />
                        ) : (
                          <div className="chat-user-avatar-letter" style={{ background: getAvatarColor(user.displayName) }}>
                            {(user.displayName && user.displayName.length > 0 ? user.displayName[0] : "U").toUpperCase()}
                          </div>
                        )}
                        <div className="chat-user-info">
                          <span className="chat-user-name">{user.displayName || "Unknown User"}</span>
                          <span className="chat-user-email">{user.email || ""}</span>
                        </div>
                      </div>
                    ))}
                    {searchQuery && filteredUsers.length === 0 && (
                      <div className="new-chat-empty">No users found</div>
                    )}
                  </div>
                </div>
              ) : (
                visibleChats.length === 0 ? (
                  <div className="chat-list-empty">
                    <p>No chats match your search.</p>
                  </div>
                ) : (
                  visibleChats.map(chat => {
                    if (!chat || !chat.userId) return null; // Skip invalid chats
                    const profile = chat.profile || {};
                    const avatarUrl = getAvatarUrl(profile);
                    const name = profile.displayName || "User";
                    return (
                      <div
                        key={chat.userId}
                        className={`chat-list-item ${selectedChat?.userId === chat.userId ? "active" : ""}`}
                        onClick={() => {
                          setSelectedChat(chat);
                        }}
                      >
                        <div className="chat-list-avatar-wrap">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="" className="chat-list-avatar" loading="lazy" />
                          ) : (
                            <div className="chat-list-avatar-letter" style={{ background: getAvatarColor(name) }}>
                              {name && name.length > 0 ? name[0].toUpperCase() : "U"}
                            </div>
                          )}
                        </div>
                        <div className="chat-list-info">
                          <div className="chat-list-top">
                            <span className="chat-list-name">{name}</span>
                            <span className="chat-list-time">{timeAgo(chat.lastMessageTime)}</span>
                          </div>
                          <p className="chat-list-preview">
                            {chat.lastSenderId === currentUser.uid ? "You: " : ""}
                            {chat.lastMessage || "Start chatting..."}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className={`chat-window ${!selectedChat ? "hide-mobile" : ""}`}>
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="chat-window-header">
                  <button className="chat-back-btn" onClick={() => setSelectedChat(null)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                  </button>
                  <div className="chat-header-user" onClick={() => navigate(`/profile/${selectedChat.userId}`)}>
                    <div className="chat-header-avatar-wrap">
                      {getAvatarUrl(selectedChat.profile) ? (
                        <img src={getAvatarUrl(selectedChat.profile)} alt="" className="chat-header-avatar" loading="lazy" />
                      ) : (
                        <div className="chat-header-avatar-letter" style={{ background: getAvatarColor(selectedChat.profile?.displayName) }}>
                          {(selectedChat.profile?.displayName && selectedChat.profile.displayName.length > 0 ? selectedChat.profile.displayName[0] : "U").toUpperCase()}
                        </div>
                      )}
                      {selectedPresence?.online && <div className="online-dot"></div>}
                    </div>
                    <div>
                      <div className="chat-header-name">{selectedChat.profile?.displayName || "User"}</div>
                      <div className="chat-header-status">
                        {selectedPresence?.online ? (
                          <span className="status-online">Online</span>
                        ) : selectedPresence?.lastSeen ? (
                          <span className="status-offline">Last seen {timeAgo(selectedPresence.lastSeen)}</span>
                        ) : (
                          <span className="status-offline">Offline</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="chat-messages">
                  {messagesLoading ? (
                    <div className="chat-messages-loading">
                      <p>Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="chat-messages-empty">
                      <span>👋</span>
                      <p>Say hello to {selectedChat.profile?.displayName?.split(" ")[0] || "User"}!</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`chat-message ${msg.senderId === currentUser.uid ? "sent" : "received"}`}
                      >
                        <div className="chat-bubble">
                          <p>{msg.text}</p>
                          <span className="chat-msg-time">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {msg.senderId === currentUser.uid && (
                              <span className="msg-read-status">{msg.read ? " ✓✓" : " ✓"}</span>
                            )}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form className="chat-input-bar" onSubmit={handleSend}>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="chat-input"
                    maxLength={500}
                  />
                  <button type="submit" className="chat-send-btn" disabled={!newMessage.trim()}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </form>
              </>
            ) : (
              <div className="chat-no-selection">
                <div className="chat-no-selection-icon">💬</div>
                <h3>Your Messages</h3>
                <p>Send private messages to friends</p>
                <button onClick={() => setShowNewChat(true)}>Start a Conversation</button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
