import { useCallback, useEffect, useMemo, useState } from "react";
import { InfoIconButton } from "./InfoIconButton";
import { MealEstimateApiLogDialog } from "./MealEstimateApiLogDialog";
import { api } from "../lib/api";
import {
  formatApiLogCost,
  formatApiLogTimestamp,
  summarizeApiLogs,
} from "../lib/mealEstimateApiLogDisplay";
import type { MealEstimateApiLog } from "../types";

type Props = {
  enabled: boolean;
};

export function MealEstimateApiLogPanel({ enabled }: Props) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<MealEstimateApiLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<MealEstimateApiLog | null>(
    null
  );
  const [clearing, setClearing] = useState(false);

  const summary = useMemo(() => summarizeApiLogs(logs), [logs]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await api.listMealEstimateApiLogs(200);
      setLogs(rows);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !enabled) return;
    void loadLogs();
  }, [open, enabled, loadLogs]);

  const clearLogs = async () => {
    if (!window.confirm("Clear all API call logs?")) return;
    setClearing(true);
    setError(null);
    try {
      await api.clearMealEstimateApiLogs();
      setLogs([]);
      setSelectedLog(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="mt-4 border-t border-slate-800 pt-4">
      <button
        type="button"
        disabled={!enabled}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-1 py-1 text-left text-sm text-slate-300 transition-colors hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        aria-expanded={open}
      >
        <span className="font-medium">API call log</span>
        <span className="flex items-center gap-2 text-xs text-slate-500">
          {open ? "Hide" : "Show"}
          <i
            aria-hidden
            className={`fa-solid fa-chevron-down text-[10px] transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              {summary.totalCalls === 0
                ? "No API calls logged yet."
                : `${summary.totalCalls} call${summary.totalCalls === 1 ? "" : "s"} · ${summary.successCalls} succeeded · ${summary.totalTokens.toLocaleString()} tokens · est. ${formatApiLogCost(summary.totalCost)}`}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadLogs()}
                disabled={loading || !enabled}
                className="cursor-pointer rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
              <button
                type="button"
                onClick={() => void clearLogs()}
                disabled={clearing || logs.length === 0 || !enabled}
                className="cursor-pointer rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {clearing ? "Clearing…" : "Clear"}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {logs.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full table-fixed text-left text-xs">
                <colgroup>
                  <col className="w-[8.25rem]" />
                  <col />
                  <col className="w-20" />
                  <col className="w-14" />
                </colgroup>
                <thead className="bg-slate-900/80 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Time</th>
                    <th className="px-3 py-2 font-medium">Request</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {logs.map((log) => (
                    <tr key={log.id} className="align-top text-slate-300">
                      <td className="whitespace-nowrap px-3 py-2 text-slate-400">
                        {formatApiLogTimestamp(log.createdAt)}
                      </td>
                      <td className="min-w-0 px-3 py-2">
                        <span className="block break-words" title={log.description}>
                          {log.description}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span
                          className={
                            log.status === "success"
                              ? "text-emerald-400"
                              : "text-red-400"
                          }
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <InfoIconButton
                          aria-label="View API call details"
                          onClick={() => setSelectedLog(log)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11px] text-slate-600">
            Cached estimates do not create log entries. Token counts come from
            Gemini usage metadata; cost is an approximate list-price estimate.
          </p>
        </div>
      )}

      {selectedLog && (
        <MealEstimateApiLogDialog
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}
