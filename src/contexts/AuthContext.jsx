import { createContext, useContext, useState, useEffect } from "react";
import { signupUser, loginUser, googleSignIn, logoutUser, onAuthChange, resetPassword, setupPresence } from "../App.js";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function signup(email, password, displayName) {
    return signupUser(email, password, displayName);
  }

  function login(email, password) {
    return loginUser(email, password);
  }

  function loginWithGoogle() {
    return googleSignIn();
  }

  function logout() {
    return logoutUser();
  }

  function forgotPassword(email) {
    return resetPassword(email);
  }

  useEffect(() => {
    let cleanupPresence = null;
    const unsubscribe = onAuthChange((user) => {
      try {
        setCurrentUser(user);
        
        // Setup online presence tracking
        if (cleanupPresence) cleanupPresence();
        if (user) {
          cleanupPresence = setupPresence(user.uid);
        }
      } catch (err) {
        console.error("Auth change error (context):", err);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (cleanupPresence) cleanupPresence();
    };
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    loginWithGoogle,
    logout,
    forgotPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
