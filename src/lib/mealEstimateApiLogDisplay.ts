import { format, parseISO } from "date-fns";
import type { MealEstimateApiLog } from "../types";

export function formatApiLogTimestamp(createdAt: string): string {
  const normalized = createdAt.includes("T")
    ? createdAt
    : createdAt.replace(" ", "T");
  return format(parseISO(normalized), "dd/MM/yy HH:mm:ss");
}

export function formatApiLogCost(costUsd: number | null): string {
  if (costUsd == null) return "—";
  if (costUsd === 0) return "$0.00";
  if (costUsd < 0.01) return `<$0.01`;
  return `$${costUsd.toFixed(4)}`;
}

export function formatApiLogTokens(log: MealEstimateApiLog): string {
  if (log.totalTokens != null) {
    return log.totalTokens.toLocaleString();
  }
  const parts: string[] = [];
  if (log.promptTokens != null) {
    parts.push(`${log.promptTokens.toLocaleString()} in`);
  }
  if (log.outputTokens != null) {
    parts.push(`${log.outputTokens.toLocaleString()} out`);
  }
  return parts.length > 0 ? parts.join(" / ") : "—";
}

export function formatApiLogDuration(durationMs: number): string {
  if (durationMs < 1000) return `${durationMs} ms`;
  return `${(durationMs / 1000).toFixed(1)} s`;
}

export function summarizeApiLogs(logs: MealEstimateApiLog[]) {
  const totalCalls = logs.length;
  const successCalls = logs.filter((log) => log.status === "success").length;
  const totalTokens = logs.reduce(
    (sum, log) => sum + (log.totalTokens ?? 0),
    0
  );
  const totalCost = logs.reduce(
    (sum, log) => sum + (log.estimatedCostUsd ?? 0),
    0
  );
  return { totalCalls, successCalls, totalTokens, totalCost };
}
