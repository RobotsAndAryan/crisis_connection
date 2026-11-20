import React from 'react';

interface UncertaintyMeterProps {
  value: number;
  compact?: boolean;
  showLabel?: boolean;
}

/**
 * Signature Crisis Connection calibration gauge:
 * 10 discrete 2px ticks paired with a tabular percentage so epistemic uncertainty
 * reads at a glance without glowing pills or decorative chrome.
 */
export const UncertaintyMeter: React.FC<UncertaintyMeterProps> = ({
  value,
  compact = false,
  showLabel = true,
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const filledTicks = Math.max(1, Math.round(clamped / 10));
  const tone =
    clamped >= 50
      ? { bar: 'bg-hazard', text: 'text-hazard' }
      : clamped >= 25
        ? { bar: 'bg-caution', text: 'text-caution' }
        : { bar: 'bg-safe', text: 'text-safe' };

  return (
    <span
      className="inline-flex items-center gap-2"
      title={`Data uncertainty: ${clamped}%`}
    >
      <span
        aria-hidden="true"
        className={`inline-flex items-center ${compact ? 'gap-[2px]' : 'gap-[3px]'}`}
      >
        {Array.from({ length: 10 }).map((_, idx) => (
          <span
            key={idx}
            className={`${compact ? 'h-[6px] w-[2px]' : 'h-[8px] w-[2px]'} rounded-[1px] ${
              idx < filledTicks ? tone.bar : 'bg-ink-primary/15'
            }`}
          />
        ))}
      </span>
      {showLabel && (
        <span className={`tabular font-mono text-xs font-medium ${tone.text}`}>
          {clamped}%
        </span>
      )}
    </span>
  );
};
