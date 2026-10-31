import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { currentUserRequest, loginRequest } from '../api/auth.js';

const AuthContext = createContext(null);
const TOKEN_KEY = 'brightloop.accessToken';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const onUnauthorized = () => clearSession();
    window.addEventListener('brightloop:unauthorized', onUnauthorized);
    return () => window.removeEventListener('brightloop:unauthorized', onUnauthorized);
  }, [clearSession]);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    let alive = true;
    currentUserRequest(token).then((result) => { if (alive) setUser(result.data); })
      .catch(() => { if (alive) clearSession(); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token, clearSession]);

  const signIn = useCallback(async (credentials) => {
    const result = await loginRequest(credentials);
    sessionStorage.setItem(TOKEN_KEY, result.data.accessToken);
    setToken(result.data.accessToken);
    setUser(result.data.user);
    return result.data.user;
  }, []);

  const value = useMemo(() => ({ token, user, loading, signIn, signOut: clearSession }), [token, user, loading, signIn, clearSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
