import React from 'react';
import {
  ArrowRight,
  Cloud,
  Cpu,
  Download,
  GitMerge,
  Radio,
} from 'lucide-react';
import { FieldPackSnapshot, OperatingMode } from '../types/crisis';
import { ActiveTab } from './TopCommandBar';

interface ClosedLoopBannerProps {
  operatingMode: OperatingMode;
  activeTab: ActiveTab;
  snapshot: FieldPackSnapshot | null;
  unsyncedReportCount: number;
  onSelectTab: (tab: ActiveTab) => void;
  onDownloadFieldPack: () => void;
}

export const ClosedLoopBanner: React.FC<ClosedLoopBannerProps> = ({
  operatingMode,
  activeTab,
  snapshot,
  unsyncedReportCount,
  onSelectTab,
  onDownloadFieldPack,
}) => {
  const isOffline = operatingMode === 'FIELD_OFFLINE';

  const stages = [
    {
      num: '01',
      title: 'Base Camp DB',
      subtitle: 'Firestore + Map + Protocols',
      icon: <Cloud className="h-3.5 w-3.5" />,
      active: !isOffline && activeTab === 'map',
      done: true,
      onClick: () => onSelectTab('map'),
    },
    {
      num: '02',
      title: 'Pre-Departure Pack',
      subtitle: snapshot ? `Cached ${snapshot.checksum}` : 'Download DB + Nano 4',
      icon: <Download className="h-3.5 w-3.5" />,
      active: Boolean(snapshot) && !isOffline,
      done: Boolean(snapshot),
      onClick: onDownloadFieldPack,
    },
    {
      num: '03',
      title: 'In-Field Hybrid AI',
      subtitle: isOffline ? 'ONLY_ON_DEVICE (Nano 4)' : 'PREFER_ON_DEVICE',
      icon: <Cpu className="h-3.5 w-3.5" />,
      active: isOffline || activeTab === 'field',
      done: isOffline,
      onClick: () => onSelectTab('field'),
    },
    {
      num: '04',
      title: 'Local Mesh Gossip',
      subtitle: 'Adaptive X-Cycle Peer Sync',
      icon: <Radio className="h-3.5 w-3.5" />,
      active: activeTab === 'mesh',
      done: false,
      onClick: () => onSelectTab('mesh'),
    },
    {
      num: '05',
      title: 'Cloud Reconciliation',
      subtitle:
        unsyncedReportCount > 0
          ? `${unsyncedReportCount} conflict(s) + CCTV`
          : 'Conflict + Forecast + Unc.',
      icon: <GitMerge className="h-3.5 w-3.5" />,
      active: activeTab === 'cloud',
      done: unsyncedReportCount === 0,
      onClick: () => onSelectTab('cloud'),
    },
  ];

  return (
    <div className="mb-4 overflow-x-auto rounded-2xl border border-slate-800/90 bg-slate-900/60 px-3 py-2">
      <div className="flex min-w-[760px] items-center justify-between gap-2">
        {stages.map((st, idx) => (
          <React.Fragment key={st.num}>
            <button
              onClick={st.onClick}
              className={`flex flex-1 items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition ${
                st.active
                  ? 'border-cyan-500/50 bg-cyan-500/10 shadow-sm shadow-cyan-950/50'
                  : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                  st.active
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : st.done
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-slate-800 text-slate-400'
                }`}
              >
                {st.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[9.5px] font-bold text-slate-500">
                    {st.num}
                  </span>
                  <span className="truncate text-xs font-bold text-slate-100">{st.title}</span>
                </div>
                <div className="truncate text-[10px] text-slate-400">{st.subtitle}</div>
              </div>
            </button>
            {idx < stages.length - 1 && (
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
