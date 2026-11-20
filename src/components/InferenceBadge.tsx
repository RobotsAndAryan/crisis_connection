import React from 'react';
import { Cloud, Cpu, ShieldAlert } from 'lucide-react';
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
  if (source === 'ON_DEVICE') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-emerald-300">
        <Cpu className="h-3 w-3" />
        <span>{compact ? 'ON-DEVICE' : 'ON-DEVICE · Gemini Nano 4'}</span>
        {latencyMs !== undefined && (
          <span className="font-mono text-emerald-400/80">{latencyMs}ms</span>
        )}
      </span>
    );
  }

  if (source === 'IN_CLOUD') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-violet-300">
        <Cloud className="h-3 w-3" />
        <span>{compact ? 'IN-CLOUD' : 'IN-CLOUD · Gemini Fallback'}</span>
        {latencyMs !== undefined && (
          <span className="font-mono text-violet-300/80">{latencyMs}ms</span>
        )}
      </span>
    );
  }

  return (
    <span
      title={`Requested Firebase AI Logic mode: ${requestedMode ?? 'hybrid'}. Enable Chrome Gemini Nano 4 or add Firebase credentials in Setup for live model inference.`}
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-amber-300"
    >
      <ShieldAlert className="h-3 w-3" />
      <span>{compact ? 'SANDBOX ENGINE' : 'OFFLINE SANDBOX (Connect Firebase / Nano 4)'}</span>
      {latencyMs !== undefined && (
        <span className="font-mono text-amber-300/80">{latencyMs}ms</span>
      )}
    </span>
  );
};
