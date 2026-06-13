import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { useSettings } from "../hooks/useSettings";
import {
  formatSyncTime,
  resolveSyncConflict,
  runSyncFlow,
  type SyncConflict,
  type SyncStatus,
} from "../lib/sync";

interface SyncContextValue {
  status: SyncStatus;
  statusMessage: string | null;
  conflict: SyncConflict | null;
  syncNow: () => Promise<void>;
  resolveConflict: (choice: "keepLocal" | "useRemote") => Promise<void>;
  dismissConflict: () => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { signedIn, syncState, refresh: refreshAuth } = useAuth();
  const { refresh: refreshSettings } = useSettings();
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState<SyncConflict | null>(null);
  const autoSyncStarted = useRef(false);

  const syncNow = useCallback(async () => {
    if (!signedIn) return;
    setStatus("syncing");
    setStatusMessage(null);
    setConflict(null);
    try {
      const pending = await runSyncFlow();
      if (pending) {
        setConflict(pending);
        setStatus("conflict");
        setStatusMessage("This device and your cloud copy both changed.");
        return;
      }
      await refreshAuth();
      await refreshSettings();
      setStatus("upToDate");
      setStatusMessage(
        `Synced ${formatSyncTime(new Date().toISOString())}`
      );
    } catch (e) {
      setStatus("error");
      setStatusMessage(String(e));
      throw e;
    }
  }, [signedIn, refreshAuth, refreshSettings]);

  const resolveConflict = useCallback(
    async (choice: "keepLocal" | "useRemote") => {
      if (!conflict) return;
      setStatus("syncing");
      try {
        await resolveSyncConflict(choice, conflict);
        setConflict(null);
        await refreshAuth();
        await refreshSettings();
        setStatus("upToDate");
        setStatusMessage(
          choice === "useRemote"
            ? "Restored data from cloud."
            : "Uploaded this device to cloud."
        );
      } catch (e) {
        setStatus("error");
        setStatusMessage(String(e));
        throw e;
      }
    },
    [conflict, refreshAuth, refreshSettings]
  );

  const dismissConflict = useCallback(() => {
    setConflict(null);
    setStatus("idle");
    setStatusMessage(null);
  }, []);

  useEffect(() => {
    if (!signedIn || autoSyncStarted.current) return;
    autoSyncStarted.current = true;
    void syncNow().catch(() => {
      /* Settings UI shows error via statusMessage */
    });
  }, [signedIn, syncNow]);

  useEffect(() => {
    if (!signedIn) {
      setStatus("idle");
      setStatusMessage(null);
      setConflict(null);
      autoSyncStarted.current = false;
      return;
    }
    if (syncState?.lastSyncedAt && status === "idle") {
      setStatus("upToDate");
      setStatusMessage(`Last synced ${formatSyncTime(syncState.lastSyncedAt)}`);
    }
  }, [signedIn, syncState?.lastSyncedAt, status]);

  return (
    <SyncContext.Provider
      value={{
        status,
        statusMessage,
        conflict,
        syncNow,
        resolveConflict,
        dismissConflict,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error("useSync must be used within SyncProvider");
  }
  return ctx;
}
