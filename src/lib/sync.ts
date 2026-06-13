import type { SyncSnapshot } from "../types";
import { api } from "./api";
import { googleRefreshAccessToken } from "./googleAuth";

export type SyncStatus =
  | "idle"
  | "syncing"
  | "upToDate"
  | "error"
  | "conflict";

export type SyncConflictChoice = "keepLocal" | "useRemote";

export interface SyncConflict {
  remoteSnapshot: SyncSnapshot;
  remoteModifiedTime: string;
}

function parseTime(value: string | null | undefined): number {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

function isLocalModified(
  localModifiedAt: string | null,
  lastSyncedAt: string | null
): boolean {
  if (!localModifiedAt) return false;
  if (!lastSyncedAt) return true;
  return parseTime(localModifiedAt) > parseTime(lastSyncedAt);
}

function isRemoteNewer(
  remoteExportedAt: string,
  lastSyncedAt: string | null
): boolean {
  if (!lastSyncedAt) return true;
  return parseTime(remoteExportedAt) > parseTime(lastSyncedAt);
}

export async function pullRemoteSnapshot(): Promise<{
  found: boolean;
  snapshot: SyncSnapshot | null;
  remoteModifiedTime: string | null;
}> {
  const { accessToken } = await googleRefreshAccessToken();
  const result = await api.syncPull(accessToken);
  return {
    found: result.found,
    snapshot: result.snapshot ?? null,
    remoteModifiedTime: result.remoteModifiedTime ?? null,
  };
}

export async function pushLocalSnapshot(): Promise<void> {
  const { accessToken } = await googleRefreshAccessToken();
  const snapshot = await api.syncPush(accessToken);
  await api.markSynced(snapshot.exportedAt);
}

export async function applyRemoteSnapshot(snapshot: SyncSnapshot): Promise<void> {
  await api.importSyncSnapshot(snapshot);
  await api.markSynced(snapshot.exportedAt);
}

/** Returns conflict details when both sides changed; otherwise completes sync. */
export async function runSyncFlow(): Promise<SyncConflict | null> {
  const state = await api.getSyncState();
  const refresh = await api.getGoogleRefreshToken();
  if (!refresh) {
    throw new Error("Sign in with Google to sync.");
  }

  const { found, snapshot, remoteModifiedTime } = await pullRemoteSnapshot();

  if (!found || !snapshot) {
    await pushLocalSnapshot();
    return null;
  }

  const remoteNewer = isRemoteNewer(snapshot.exportedAt, state.lastSyncedAt);
  const localChanged = isLocalModified(
    state.localModifiedAt,
    state.lastSyncedAt
  );

  if (remoteNewer && localChanged) {
    return {
      remoteSnapshot: snapshot,
      remoteModifiedTime: remoteModifiedTime ?? snapshot.exportedAt,
    };
  }

  if (remoteNewer) {
    await applyRemoteSnapshot(snapshot);
    return null;
  }

  if (localChanged) {
    await pushLocalSnapshot();
    return null;
  }

  return null;
}

export async function resolveSyncConflict(
  choice: SyncConflictChoice,
  conflict: SyncConflict
): Promise<void> {
  if (choice === "useRemote") {
    await applyRemoteSnapshot(conflict.remoteSnapshot);
    return;
  }
  await pushLocalSnapshot();
}

export function formatSyncTime(iso: string | null): string {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
