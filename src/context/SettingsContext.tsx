import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "../lib/api";
import {
  applyAccentColor,
  normalizeAccentColor,
} from "../lib/accentColor";
import type { Settings } from "../types";

interface SettingsContextValue {
  settings: Settings | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  save: (next: Settings) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const s = await api.getSettings();
      setSettings({
        ...s,
        accentColor: normalizeAccentColor(s.accentColor),
      });
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    applyAccentColor(normalizeAccentColor(settings?.accentColor));
  }, [settings?.accentColor]);

  const save = useCallback(
    async (next: Settings) => {
      setSettings(next);
      applyAccentColor(normalizeAccentColor(next.accentColor));
      try {
        await api.updateSettings(next);
        setError(null);
      } catch (e) {
        setError(String(e));
        await refresh();
        throw e;
      }
    },
    [refresh]
  );

  return (
    <SettingsContext.Provider
      value={{ settings, loading, error, refresh, save }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return ctx;
}
