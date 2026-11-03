import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { MessageCircle, User, AtSign, Lock, Eye, EyeOff, UserPlus, AlertCircle } from 'lucide-react';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      setShakeKey(k => k + 1);
      return;
    }
    setLoading(true);
    try {
      await signup(username.trim(), password, displayName.trim() || username.trim());
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Try again.');
      setShakeKey(k => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-blob b1" />
      <div className="auth-blob b2" />
      <div className="auth-blob b3" />

      <div className="auth-card">
        <div className="auth-logo anim-pop">
          <MessageCircle size={30} strokeWidth={2.2} />
        </div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Join and start chatting in seconds</p>

        <form className="auth-form" onSubmit={handleSubmit} key={shakeKey}>
          {error && (
            <div className="auth-error anim-shake" role="alert">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="field">
            <AtSign size={17} />
            <input
              placeholder="Username (unique)"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              minLength={3}
              required
            />
          </div>

          <div className="field">
            <User size={17} />
            <input
              placeholder="Display name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="field">
            <Lock size={17} />
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Password (min 4 chars)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={4}
              required
            />
            <button
              type="button"
              className="eye-btn"
              onClick={() => setShowPass(s => !s)}
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : <UserPlus size={18} />}
            {loading ? 'Creating…' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
