import type { SyncConflict } from "../lib/sync";

interface SyncConflictDialogProps {
  conflict: SyncConflict;
  onKeepLocal: () => void;
  onUseRemote: () => void;
  onDismiss: () => void;
  busy?: boolean;
}

export function SyncConflictDialog({
  conflict,
  onKeepLocal,
  onUseRemote,
  onDismiss,
  busy = false,
}: SyncConflictDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-conflict-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
        <h2
          id="sync-conflict-title"
          className="text-lg font-semibold text-slate-100"
        >
          Sync conflict
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          This device and another device both changed your health data since the
          last sync. Choose which copy to keep.
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Cloud copy from{" "}
          {new Date(
            conflict.remoteModifiedTime || conflict.remoteSnapshot.exportedAt
          ).toLocaleString()}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onDismiss}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            Decide later
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onUseRemote}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            Use cloud copy
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onKeepLocal}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Keep this device
          </button>
        </div>
      </div>
    </div>
  );
}
