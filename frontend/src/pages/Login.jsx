import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>💬</div>
        <h1 style={styles.title}>ChatApp</h1>
        <p style={styles.subtitle}>Login to continue</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}
          <input
            style={styles.input}
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p style={styles.footer}>
          New here? <Link to="/signup">Create account</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0b141a 0%, #111b21 50%, #0b141a 100%)',
  },
  card: {
    background: '#111b21',
    padding: '40px',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '380px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    border: '1px solid #222d34',
  },
  logo: { fontSize: '48px', textAlign: 'center', marginBottom: '8px' },
  title: { textAlign: 'center', fontSize: '28px', marginBottom: '4px' },
  subtitle: { textAlign: 'center', color: '#8696a0', marginBottom: '28px' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  input: {
    background: '#202c33',
    padding: '14px 16px',
    borderRadius: '8px',
    border: '1px solid #2a3942',
  },
  btn: {
    background: '#00a884',
    color: '#111b21',
    padding: '14px',
    borderRadius: '8px',
    fontWeight: 600,
    marginTop: '8px',
  },
  error: {
    background: 'rgba(234,67,53,0.15)',
    color: '#ea4335',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '14px',
  },
  footer: { textAlign: 'center', marginTop: '24px', color: '#8696a0', fontSize: '14px' },
};
