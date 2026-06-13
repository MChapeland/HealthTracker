import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "../lib/api";
import { googleSignIn, googleSignOut } from "../lib/googleAuth";
import { getGoogleClientId } from "../lib/googleAuthConfig";
import type { SyncState } from "../types";

interface AuthContextValue {
  syncState: SyncState | null;
  signedIn: boolean;
  loading: boolean;
  error: string | null;
  configured: boolean;
  refresh: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isConfigured(): boolean {
  try {
    getGoogleClientId();
    return true;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const configured = isConfigured();

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const state = await api.getSyncState();
      setSyncState(state);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async () => {
    setError(null);
    await googleSignIn();
    await refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    setError(null);
    await googleSignOut();
    await refresh();
  }, [refresh]);

  const signedIn = Boolean(syncState?.googleAccountEmail);

  return (
    <AuthContext.Provider
      value={{
        syncState,
        signedIn,
        loading,
        error,
        configured,
        refresh,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
