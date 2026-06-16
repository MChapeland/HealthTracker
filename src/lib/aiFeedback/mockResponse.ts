import type {
  AiFeedbackTopic,
  ProgressFeedbackRequest,
  ProgressFeedbackResponse,
} from "../../types";

export function mockProgressFeedbackResponse(
  _topic: AiFeedbackTopic,
  payload?: ProgressFeedbackRequest
): ProgressFeedbackResponse {
  return {
    headline: "Your recent logs show steady progress",
    status: "On track (mock)",
    summary:
      "This is placeholder feedback for development. Connect your Gemini API key in Settings to get real coaching.",
    likelyExplanation:
      "Mock mode uses sample text. Real analysis uses your computed metrics as the source of truth.",
    positiveSignals: [
      "You have been logging regularly enough to spot trends.",
      "Your data gives a reasonable picture of the last 30 days.",
    ],
    watchOuts: ["Some days may still be missing logs."],
    nextSteps: [
      "Keep logging consistently for another week.",
      "Pick one habit to focus on if anything feels unclear.",
    ],
    confidence: payload?.computed.confidence ?? "medium",
    confidenceReason:
      payload?.computed.confidenceReason ??
      "Mock response — confidence mirrors local analysis.",
    debugPayload: payload,
  };
}
