import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { api, errorMessage, getToken, sessionExpiredEvent, setToken } from '../lib/api';
import type { User } from '../types/api';
import { navigate } from './navigation';
import { SessionContext } from './useSession';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(getToken()));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUser(await api.me());
    } catch (reason) {
      if (getToken()) setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (getToken()) {
      api
        .me(controller.signal)
        .then((value) => {
          if (!controller.signal.aborted) setUser(value);
        })
        .catch((reason: unknown) => {
          if (!controller.signal.aborted && getToken()) setError(errorMessage(reason));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }
    const expire = () => {
      setUser(null);
      setError(null);
      setNotice('Your session has expired. Please sign in again.');
      navigate('/login');
    };
    window.addEventListener(sessionExpiredEvent, expire);
    return () => {
      controller.abort();
      window.removeEventListener(sessionExpiredEvent, expire);
    };
  }, []);

  async function signIn(email: string, password: string) {
    const result = await api.login(email, password);
    setToken(result.token);
    setUser(result.user);
    setError(null);
    setNotice(null);
    navigate('/equipment');
  }

  function signOut() {
    setToken(null);
    setUser(null);
    setError(null);
    setNotice(null);
    navigate('/login');
  }

  return (
    <SessionContext.Provider value={{ user, loading, error, notice, signIn, signOut, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}
