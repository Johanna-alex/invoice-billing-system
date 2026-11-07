import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/api";
import AuthContext from "./auth-context";

const TOKEN_KEY = "invoice_billing_token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const apiFetch = useCallback(
    async (path, options = {}) => {
      try {
        return await apiRequest(path, options, token);
      } catch (error) {
        if (error.status === 401) logout();
        throw error;
      }
    },
    [token, logout]
  );

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      if (!token) {
        if (active) setLoading(false);
        return;
      }

      try {
        const currentUser = await apiRequest("/auth/me", {}, token);
        if (active) setUser(currentUser);
      } catch {
        if (active) logout();
      } finally {
        if (active) setLoading(false);
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, [token, logout]);

  const login = async (email, password) => {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = (name, email, password) => {
    return apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password })
    });
  };

  const value = useMemo(
    () => ({ token, user, loading, login, register, logout, apiFetch }),
    [token, user, loading, logout, apiFetch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
