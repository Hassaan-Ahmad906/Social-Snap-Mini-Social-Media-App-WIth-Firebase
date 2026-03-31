import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import "./Auth.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      setLoading(true);
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(
        err.code === "auth/user-not-found"
          ? "No account found with this email"
          : err.code === "auth/invalid-email"
          ? "Please enter a valid email address"
          : err.message
      );
    }
    setLoading(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo" style={{ marginBottom: "1rem" }}>
            <Logo size={60} showText={false} />
          </div>
          <h1>Reset Password</h1>
          <p>Enter your email to receive a password reset link</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {success ? (
          <div className="auth-success">
            <div className="success-icon">✉️</div>
            <h3>Check your email</h3>
            <p>We've sent a password reset link to <strong>{email}</strong></p>
            <p className="success-hint">Check your spam folder if you don't see it.</p>
            <Link to="/login" className="auth-btn" style={{ display: "block", textAlign: "center", marginTop: "1rem" }}>
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? <span className="spinner"></span> : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="auth-switch">
          Remember your password? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
