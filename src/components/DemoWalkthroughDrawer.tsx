import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, ChevronRightIcon, PlayIcon, XIcon } from './icons';
import { OperatingMode } from '../types/crisis';
import { ActiveTab } from './TopCommandBar';

interface DemoWalkthroughDrawerProps {
  open: boolean;
  onClose: () => void;
  onSelectTab: (tab: ActiveTab) => void;
  onSetMode: (mode: OperatingMode) => void;
  onDownloadPack: () => void;
}

interface DemoStep {
  id: number;
  time: string;
  title: string;
  actionLabel: string;
  description: string;
  run: () => void;
}

export const DemoWalkthroughDrawer: React.FC<DemoWalkthroughDrawerProps> = ({
  open,
  onClose,
  onSelectTab,
  onSetMode,
  onDownloadPack,
}) => {
  const [completed, setCompleted] = useState<number[]>([]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const markDone = (id: number) =>
    setCompleted((prev) => (prev.includes(id) ? prev : [...prev, id]));

  const steps: DemoStep[] = [
    {
      id: 1,
      time: '0:00–0:35',
      title: 'Pre-departure pack and Nano 4 warm-up',
      actionLabel: 'Download pack',
      description:
        'Start online at Base camp. Download the Field pack to snapshot aid camps, beds, protocols, and initialize Gemini Nano 4.',
      run: () => {
        onSetMode('BASE_CAMP_ONLINE');
        onSelectTab('map');
        onDownloadPack();
        markDone(1);
      },
    },
    {
      id: 2,
      time: '0:35–1:15',
      title: 'Go offline with danger-weighted map routing',
      actionLabel: 'Switch offline',
      description:
        'Enter Field offline mode. Move the field marker or query local AI to compare the safest route against the blocked overpass shortcut.',
      run: () => {
        onSetMode('FIELD_OFFLINE');
        onSelectTab('map');
        markDone(2);
      },
    },
    {
      id: 3,
      time: '1:15–1:50',
      title: 'Offline multimodal triage and field report',
      actionLabel: 'Open Field AI',
      description:
        'Ask a CPR or tourniquet question offline against cached protocols, then log a conflicting bed observation into the offline outbox.',
      run: () => {
        onSetMode('FIELD_OFFLINE');
        onSelectTab('field');
        markDone(3);
      },
    },
    {
      id: 4,
      time: '1:50–2:15',
      title: 'Peer local mesh sync and emergency flood',
      actionLabel: 'Open Local mesh',
      description:
        'Open a second handset tab offline, report a camp destroyed, and watch the adaptive cycle tighten to 4s across tabs without cloud uplink.',
      run: () => {
        onSetMode('FIELD_OFFLINE');
        onSelectTab('mesh');
        markDone(4);
      },
    },
    {
      id: 5,
      time: '2:15–2:55',
      title: 'Reconnect for CCTV bed count and reconciliation',
      actionLabel: 'Open Cloud command',
      description:
        'Return to Base camp online. Count ward beds via Cloud Gemini, reconcile conflicting reports with logged uncertainty, and forecast shortages.',
      run: () => {
        onSetMode('BASE_CAMP_ONLINE');
        onSelectTab('cloud');
        markDone(5);
      },
    },
  ];

  return (
    <aside
      role="dialog"
      aria-labelledby="demo-guide-title"
      className="fixed right-4 top-16 z-50 w-[368px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-control bg-surface shadow-overlay"
    >
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <div>
          <h2 id="demo-guide-title" className="text-sm font-semibold text-ink-primary">
            3-minute demo guide
          </h2>
          <p className="tabular text-xs text-ink-muted">
            {completed.length} of {steps.length} completed · Keys 1–4 switch tabs
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-raised hover:text-ink-primary"
          aria-label="Close demo guide"
        >
          <XIcon size={16} />
        </button>
      </div>

      <div className="max-h-[460px] divide-y divide-hairline overflow-y-auto">
        {steps.map((s) => {
          const isDone = completed.includes(s.id);
          return (
            <div key={s.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="tabular font-mono text-[11px] text-ink-muted">{s.time}</span>
                {isDone && <CheckCircleIcon size={14} className="text-safe" />}
              </div>
              <div className="mt-1 text-[13px] font-medium text-ink-primary">{s.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{s.description}</p>
              <button
                onClick={s.run}
                className="btn-secondary mt-3 inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium"
              >
                <PlayIcon size={12} className="text-ink-muted" />
                <span>{s.actionLabel}</span>
                <ChevronRightIcon size={12} className="text-ink-muted" />
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
