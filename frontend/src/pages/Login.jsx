import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { MessageCircle, User, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Try again.');
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
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Login to continue your conversations</p>

        <form className="auth-form" onSubmit={handleSubmit} key={shakeKey}>
          {error && (
            <div className="auth-error anim-shake" role="alert">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="field">
            <User size={17} />
            <input
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="field">
            <Lock size={17} />
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
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
            {loading ? <span className="spinner" /> : <LogIn size={18} />}
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <p className="auth-footer">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
