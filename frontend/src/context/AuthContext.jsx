
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo
} from 'react';

import axios from 'axios';

const AuthContext = createContext(null);

const API = '/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    () => localStorage.getItem('token')
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const verifyUser = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const response = await axios.get(`${API}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!cancelled) {
          setUser(response.data);
        }
      } catch (error) {
        if (!cancelled) {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    verifyUser();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = async (username, password) => {
    const response = await axios.post(`${API}/auth/login`, {
      username,
      password
    });

    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    setToken(response.data.token);

    return response.data;
  };

  const signup = async (username, password, displayName) => {
    const response = await axios.post(`${API}/auth/signup`, {
      username,
      password,
      displayName
    });

    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    setToken(response.data.token);

    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({
    user,
    token,
    loading,
    login,
    signup,
    logout,
    API
  }), [user, token, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
