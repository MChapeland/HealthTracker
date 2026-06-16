import { useCallback, useState } from "react";
import { api } from "../lib/api";
import { analyzeProgress } from "../lib/aiFeedback/analyzeProgress";
import { buildProgressFeedbackRequest } from "../lib/aiFeedback/buildPayload";
import { mockProgressFeedbackResponse } from "../lib/aiFeedback/mockResponse";
import { mergeMetricsWithRange } from "../lib/weightAnalytics";
import { computeStreaks } from "../lib/streaks";
import { clampRangeStart, todayString } from "../lib/dates";
import { subDays, format } from "date-fns";
import { useSettings } from "./useSettings";
import type {
  AiFeedbackTopic,
  ProgressAnalysisResult,
  ProgressFeedbackRequest,
  ProgressFeedbackResponse,
} from "../types";

export type AiFeedbackPhase =
  | "idle"
  | "analyzing"
  | "generating"
  | "insufficient"
  | "result"
  | "error";

export function useAiFeedback() {
  const { settings, loading: settingsLoading } = useSettings();
  const [phase, setPhase] = useState<AiFeedbackPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ProgressFeedbackResponse | null>(null);
  const [analysis, setAnalysis] = useState<ProgressAnalysisResult | null>(null);
  const [payload, setPayload] = useState<ProgressFeedbackRequest | null>(null);

  const canUseAi =
    !!settings?.aiEnabled &&
    !!settings?.aiFeedbackEnabled &&
    !!settings?.aiApiKey?.trim();

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
    setResponse(null);
    setAnalysis(null);
    setPayload(null);
  }, []);

  const generate = useCallback(
    async (topic: AiFeedbackTopic, userNote?: string) => {
      if (!settings) {
        setError("Settings not loaded.");
        setPhase("error");
        return;
      }

      setError(null);
      setPhase("analyzing");

      try {
        const end = todayString();
        const start = clampRangeStart(
          format(subDays(new Date(), 29), "yyyy-MM-dd"),
          settings.journeyStartDate
        );

        const [metricsRaw, periodSummary, days] = await Promise.all([
          api.getMetricsRange(start, end),
          api.getPeriodSummary(30),
          api.listDays(start, end),
        ]);

        const metrics = mergeMetricsWithRange(metricsRaw, start, end);
        const streaks = computeStreaks(days, settings);

        const ctx = {
          metrics,
          settings,
          streaks,
          periodSummary,
          userNote,
        };

        const result = analyzeProgress(topic, ctx);
        setAnalysis(result);

        if (result.sufficiency === "insufficient") {
          setPhase("insufficient");
          return;
        }

        const requestPayload = buildProgressFeedbackRequest(
          topic,
          result,
          settings,
          userNote
        );
        setPayload(requestPayload);
        setPhase("generating");

        let feedback: ProgressFeedbackResponse;
        if (canUseAi) {
          feedback = await api.generateProgressFeedback(requestPayload);
        } else if (import.meta.env.DEV) {
          await new Promise((r) => setTimeout(r, 400));
          feedback = mockProgressFeedbackResponse(topic, requestPayload);
        } else {
          setError("Enable AI progress feedback in Settings.");
          setPhase("error");
          return;
        }

        setResponse({
          ...feedback,
          debugPayload: feedback.debugPayload ?? requestPayload,
        });
        setPhase("result");
      } catch (e) {
        setError(String(e));
        setPhase("error");
      }
    },
    [settings, canUseAi]
  );

  return {
    phase,
    error,
    response,
    analysis,
    payload,
    settingsReady: !settingsLoading && !!settings,
    canUseAi,
    generate,
    reset,
  };
}
