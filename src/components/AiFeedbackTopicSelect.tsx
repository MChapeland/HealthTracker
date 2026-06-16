import { DropdownSelect } from "./DropdownSelect";
import {
  AI_FEEDBACK_TOPICS,
  DEFAULT_AI_FEEDBACK_TOPIC,
} from "../lib/aiFeedback/topics";
import type { AiFeedbackTopic } from "../types";

type Props = {
  value: AiFeedbackTopic;
  onChange: (topic: AiFeedbackTopic) => void;
  disabled?: boolean;
};

export function AiFeedbackTopicSelect({ value, onChange, disabled }: Props) {
  return (
    <DropdownSelect
      value={value}
      onChange={onChange}
      disabled={disabled}
      aria-label="Feedback topic"
      options={AI_FEEDBACK_TOPICS.map((t) => ({
        value: t.id,
        label: t.label,
      }))}
      placeholder={DEFAULT_AI_FEEDBACK_TOPIC}
    />
  );
}
