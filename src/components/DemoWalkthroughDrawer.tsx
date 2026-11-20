import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Clapperboard,
  Play,
  X,
} from 'lucide-react';
import { OperatingMode } from '../types/crisis';
import { ActiveTab } from './TopCommandBar';

interface DemoWalkthroughDrawerProps {
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
  onSelectTab,
  onSetMode,
  onDownloadPack,
}) => {
  const [open, setOpen] = useState(false);
  const [completed, setCompleted] = useState<number[]>([]);

  const markDone = (id: number) =>
    setCompleted((prev) => (prev.includes(id) ? prev : [...prev, id]));

  const steps: DemoStep[] = [
    {
      id: 1,
      time: '0:00–0:35',
      title: '1. Pre-Departure Download & Nano 4 Warm-Up',
      actionLabel: 'Download Pack',
      description:
        'Start online at Base Camp. Click "Download Field Pack" to snapshot Firestore aid camps, beds, protocols & call model.initializeDeviceModel() for Gemini Nano 4.',
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
      title: '2. Go Offline: Local Map + Safest Path (dist × danger)',
      actionLabel: 'Go Offline + Map',
      description:
        'Switch to In Field (Offline). Click the map or ask Local AI for the closest safe camp — show how it avoids the red X Overpass Collapse and shows ON_DEVICE telemetry.',
      run: () => {
        onSetMode('FIELD_OFFLINE');
        onSelectTab('map');
        markDone(2);
      },
    },
    {
      id: 3,
      time: '1:15–1:50',
      title: '3. Offline Multimodal Field AI & Emergency Protocols',
      actionLabel: 'Open Field AI',
      description:
        'Ask a voice/text CPR or tourniquet trauma query offline against downloaded protocols, then log a conflicting bed count observation into the offline outbox.',
      run: () => {
        onSetMode('FIELD_OFFLINE');
        onSelectTab('field');
        markDone(3);
      },
    },
    {
      id: 4,
      time: '1:50–2:15',
      title: '4. Local Mesh Sync + Camp Destroyed Alert',
      actionLabel: 'Open Mesh Tab',
      description:
        'Open a 2nd handset tab offline, mark a camp DESTROYED, and show Adaptive X-Cycle accelerating to 4s EMERGENCY_BURST while propagating across tabs with zero cloud.',
      run: () => {
        onSetMode('FIELD_OFFLINE');
        onSelectTab('mesh');
        markDone(4);
      },
    },
    {
      id: 5,
      time: '2:15–2:55',
      title: '5. Reconnect to Cloud: CCTV Beds, Conflict Resolution & Forecast',
      actionLabel: 'Open Cloud Command',
      description:
        'Switch back to Base Camp (Online). Count beds from Ward CCTV via Cloud Gemini, resolve conflicting field reports with logged uncertainty, commit to Firestore, and run Shortage Forecast.',
      run: () => {
        onSetMode('BASE_CAMP_ONLINE');
        onSelectTab('cloud');
        markDone(5);
      },
    },
  ];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-cyan-500/40 bg-slate-900/95 px-3.5 py-2 text-xs font-bold text-cyan-200 shadow-xl backdrop-blur transition hover:bg-slate-800"
      >
        <Clapperboard className="h-4 w-4 text-cyan-400" />
        <span>3-Min Demo Guide</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-cyan-500/40 bg-slate-950/95 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3.5 py-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <Clapperboard className="h-4 w-4 text-cyan-400" />
          <span>#BuildHybridAI 3-Min Demo Script</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[400px] space-y-2 overflow-y-auto p-3 text-xs">
        {steps.map((s) => {
          const isDone = completed.includes(s.id);
          return (
            <div
              key={s.id}
              className={`rounded-xl border p-2.5 ${
                isDone
                  ? 'border-emerald-500/30 bg-emerald-950/20'
                  : 'border-slate-800 bg-slate-900/80'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] font-bold text-cyan-400">{s.time}</span>
                {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
              </div>
              <div className="mt-0.5 font-bold text-white">{s.title}</div>
              <p className="mt-1 text-[11px] leading-snug text-slate-400">{s.description}</p>
              <button
                onClick={s.run}
                className="mt-2 inline-flex items-center gap-1 rounded-lg bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/25"
              >
                <Play className="h-3 w-3" />
                <span>{s.actionLabel}</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
