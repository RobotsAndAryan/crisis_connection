import React from 'react';
import { ChevronRightIcon } from './icons';
import { FieldPackSnapshot, OperatingMode } from '../types/crisis';
import { OnDeviceCapabilityStatus } from '../services/hybridAI';
import { ActiveTab } from './TopCommandBar';

interface ClosedLoopBannerProps {
  operatingMode: OperatingMode;
  activeTab: ActiveTab;
  snapshot: FieldPackSnapshot | null;
  unsyncedReportCount: number;
  nanoStatus: OnDeviceCapabilityStatus;
  appCheckActive: boolean;
  onDeviceCount: number;
  inCloudCount: number;
  onSelectTab: (tab: ActiveTab) => void;
  onDownloadFieldPack: () => void;
}

export const ClosedLoopBanner: React.FC<ClosedLoopBannerProps> = ({
  operatingMode,
  activeTab,
  snapshot,
  unsyncedReportCount,
  nanoStatus,
  appCheckActive,
  onDeviceCount,
  inCloudCount,
  onSelectTab,
  onDownloadFieldPack,
}) => {
  const isOffline = operatingMode === 'FIELD_OFFLINE';

  const stages = [
    {
      id: 'base',
      label: 'Base DB',
      meta: 'Firestore',
      active: !isOffline && activeTab === 'map',
      done: true,
      onClick: () => onSelectTab('map'),
    },
    {
      id: 'pack',
      label: 'Field pack',
      meta: snapshot ? snapshot.checksum : 'Not cached',
      active: Boolean(snapshot) && !isOffline,
      done: Boolean(snapshot),
      onClick: onDownloadFieldPack,
    },
    {
      id: 'field',
      label: 'Hybrid AI',
      meta: isOffline ? 'On-device' : 'Prefer local',
      active: isOffline || activeTab === 'field',
      done: isOffline,
      onClick: () => onSelectTab('field'),
    },
    {
      id: 'mesh',
      label: 'Local mesh',
      meta: 'Adaptive sync',
      active: activeTab === 'mesh',
      done: false,
      onClick: () => onSelectTab('mesh'),
    },
    {
      id: 'cloud',
      label: 'Cloud sync',
      meta: unsyncedReportCount > 0 ? `${unsyncedReportCount} pending` : 'Reconciled',
      active: activeTab === 'cloud',
      done: unsyncedReportCount === 0,
      onClick: () => onSelectTab('cloud'),
    },
  ];

  const nanoLabel =
    nanoStatus.availability === 'available'
      ? 'Ready'
      : nanoStatus.availability === 'downloadable'
        ? 'Downloadable'
        : nanoStatus.availability === 'downloading'
          ? 'Downloading'
          : 'Unavailable';

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-3">
      {/* Closed-loop workflow steps — scrollbar-free horizontal flow on narrow screens */}
      <div className="relative min-w-0 max-w-full flex-1">
        <div
          aria-label="Closed-loop hybrid workflow"
          className="scrollbar-none flex items-center gap-1.5 overflow-x-auto pr-4 text-xs"
        >
          {stages.map((st, idx) => (
            <React.Fragment key={st.id}>
              <button
                onClick={st.onClick}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 transition-colors duration-150 ease-instrument ${
                  st.active
                    ? 'bg-raised text-ink-primary'
                    : 'text-ink-secondary hover:bg-raised/60 hover:text-ink-primary'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    st.active
                      ? isOffline
                        ? 'bg-caution'
                        : 'bg-accent'
                      : st.done
                        ? 'bg-safe'
                        : 'bg-ink-muted/50'
                  }`}
                />
                <span className="font-medium">{st.label}</span>
                <span className="hidden font-mono text-[11px] text-ink-muted sm:inline">
                  {st.meta}
                </span>
              </button>
              {idx < stages.length - 1 && (
                <ChevronRightIcon size={12} className="shrink-0 text-ink-muted/60" />
              )}
            </React.Fragment>
          ))}
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-canvas to-transparent sm:hidden"
        />
      </div>

      {/* Compact runtime telemetry */}
      <div className="hidden shrink-0 items-center gap-4 text-xs text-ink-muted xl:flex">
        <span className="flex items-center gap-1.5">
          <span>Nano 4</span>
          <span
            className={`font-medium ${
              nanoStatus.availability === 'available'
                ? 'text-safe'
                : nanoStatus.availability === 'downloadable'
                  ? 'text-accent'
                  : 'text-ink-secondary'
            }`}
          >
            {nanoLabel}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span>App Check</span>
          <span className={appCheckActive ? 'font-medium text-safe' : 'text-ink-secondary'}>
            {appCheckActive ? 'Enforced' : 'Sandbox'}
          </span>
        </span>
        <span className="tabular font-mono text-[11px] text-ink-secondary">
          {onDeviceCount} local / {inCloudCount} cloud
        </span>
      </div>
    </div>
  );
};
