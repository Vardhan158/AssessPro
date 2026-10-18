import { useState, useEffect } from 'react';
import api, { setAccessToken, clearAccessToken } from '../services/api';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      try {
        // Access tokens are memory-only. A page reload recovers the session
        // through the secure HTTP-only refresh cookie.
        const res = await api.post('/auth/refresh');
        if (res.data.success && (res.data.accessToken || res.data.token)) {
          setAccessToken(res.data.accessToken || res.data.token);
          setUser(res.data.user);
        }
      } catch {
        clearAccessToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      const token = res.data.accessToken || res.data.token;
      setAccessToken(token);
      setUser(res.data.user);
      return res.data.user;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    } finally {
      clearAccessToken();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

