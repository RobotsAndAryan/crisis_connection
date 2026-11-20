import React from 'react';
import { InferenceSourceLabel } from '../types/crisis';

interface InferenceBadgeProps {
  source: InferenceSourceLabel;
  latencyMs?: number;
  requestedMode?: string;
  compact?: boolean;
}

export const InferenceBadge: React.FC<InferenceBadgeProps> = ({
  source,
  latencyMs,
  requestedMode,
  compact = false,
}) => {
  const config =
    source === 'ON_DEVICE'
      ? {
          dot: 'bg-safe',
          label: compact ? 'On-device' : 'On-device · Gemini Nano 4',
          title: 'Executed locally on device via Gemini Nano 4',
        }
      : source === 'IN_CLOUD'
        ? {
            dot: 'bg-accent',
            label: compact ? 'In-cloud' : 'In-cloud · Gemini fallback',
            title: 'Executed in cloud via Firebase AI Logic',
          }
        : {
            dot: 'bg-caution',
            label: compact ? 'Local sandbox' : 'Offline sandbox (connect Firebase or Nano 4)',
            title: `Requested Firebase AI Logic mode: ${requestedMode ?? 'hybrid'}. Enable Chrome Gemini Nano 4 or add Firebase credentials in Diagnostics for live model inference.`,
          };

  return (
    <span
      title={config.title}
      className="inline-flex items-center gap-1.5 rounded border border-hairline bg-raised px-2 py-0.5 text-xs font-medium text-ink-secondary"
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
      {latencyMs !== undefined && (
        <span className="tabular font-mono text-[11px] text-ink-muted">{latencyMs} ms</span>
      )}
    </span>
  );
};
