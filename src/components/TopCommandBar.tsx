import React, { useState } from 'react';
import {
  CheckIcon,
  ClapperboardIcon,
  CrisisMark,
  DownloadIcon,
  SettingsIcon,
  UploadCloudIcon,
  XIcon,
} from './icons';
import {
  EmergencyAlert,
  FieldPackSnapshot,
  OperatingMode,
} from '../types/crisis';
import { OnDeviceCapabilityStatus } from '../services/hybridAI';

export type ActiveTab = 'map' | 'field' | 'mesh' | 'cloud';

interface TopCommandBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  operatingMode: OperatingMode;
  onToggleMode: (mode: OperatingMode) => void;
  onDownloadFieldPack: () => void;
  downloadingPack: boolean;
  nanoDownloadProgress: number | null;
  snapshot: FieldPackSnapshot | null;
  unsyncedReportCount: number;
  onGoToCloudSync: () => void;
  nanoStatus: OnDeviceCapabilityStatus;
  firebaseConfigured: boolean;
  activeAlerts: EmergencyAlert[];
  onDismissAlert: (id: string) => void;
  onOpenDiagnostics: () => void;
  onToggleDemoGuide: () => void;
  demoGuideOpen: boolean;
}

export const TopCommandBar: React.FC<TopCommandBarProps> = ({
  activeTab,
  onSelectTab,
  operatingMode,
  onToggleMode,
  onDownloadFieldPack,
  downloadingPack,
  nanoDownloadProgress,
  snapshot,
  unsyncedReportCount,
  onGoToCloudSync,
  nanoStatus,
  firebaseConfigured,
  activeAlerts,
  onDismissAlert,
  onOpenDiagnostics,
  onToggleDemoGuide,
  demoGuideOpen,
}) => {
  const [alertIndex, setAlertIndex] = useState(0);
  const isOffline = operatingMode === 'FIELD_OFFLINE';
  const unackAlerts = activeAlerts.filter((a) => !a.acknowledged);
  const sortedAlerts = [
    ...unackAlerts.filter((a) => a.severity === 'CRITICAL'),
    ...unackAlerts.filter((a) => a.severity !== 'CRITICAL'),
  ];
  const currentAlert =
    sortedAlerts.length > 0 ? sortedAlerts[alertIndex % sortedAlerts.length] : undefined;

  const tabs: Array<{ id: ActiveTab; label: string; shortcut: string; badge?: number }> = [
    { id: 'map', label: 'Tactical map', shortcut: '1' },
    { id: 'field', label: 'Field AI', shortcut: '2' },
    { id: 'mesh', label: 'Local mesh', shortcut: '3' },
    {
      id: 'cloud',
      label: 'Cloud command',
      shortcut: '4',
      badge: unsyncedReportCount > 0 ? unsyncedReportCount : undefined,
    },
  ];

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-sm transition-colors duration-150 ease-instrument ${
        isOffline
          ? 'border-caution/45 bg-[#191713]/95'
          : 'border-hairline bg-surface/95'
      }`}
    >
      {/* Primary 56px Command Bar */}
      <div className="mx-auto flex min-h-[56px] max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-2 lg:flex-nowrap lg:px-6">
        {/* Left: Brand + Primary Navigation */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <CrisisMark
              className={`h-[18px] w-[18px] shrink-0 ${
                isOffline ? 'text-caution' : 'text-ink-primary'
              }`}
            />
            <h1 className="text-[15px] font-semibold tracking-tight text-ink-primary">
              Crisis Connection
            </h1>
            {isOffline && (
              <span className="hidden rounded border border-caution/40 bg-caution-dim px-1.5 py-0.5 font-mono text-[11px] font-medium text-caution sm:inline">
                Offline
              </span>
            )}
          </div>

          <span className="hidden h-4 w-px bg-ink-primary/10 lg:block" aria-hidden="true" />

          <nav
            aria-label="Primary workspace"
            role="tablist"
            className="hidden items-center gap-1 lg:flex"
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={active}
                  title={`${tab.label} (press ${tab.shortcut})`}
                  onClick={() => onSelectTab(tab.id)}
                  className={`relative flex h-8 items-center gap-2 rounded-md px-3 text-[13px] font-medium transition-colors duration-150 ease-instrument ${
                    active
                      ? 'bg-raised text-ink-primary'
                      : 'text-ink-secondary hover:bg-raised/60 hover:text-ink-primary'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className="tabular font-mono text-[11px] font-medium text-caution">
                      {tab.badge}
                    </span>
                  )}
                  {active && (
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-3 -bottom-[13px] h-[2px] ${
                        isOffline ? 'bg-caution' : 'bg-accent'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Mode Switch + Primary Pack Action + Utilities */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Operating Mode Segmented Control */}
          <div
            role="group"
            aria-label="Operating mode"
            className="flex h-10 items-center rounded-lg border border-hairline bg-recessed p-0.5 sm:h-8"
          >
            <button
              aria-pressed={!isOffline}
              onClick={() => onToggleMode('BASE_CAMP_ONLINE')}
              className={`flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors duration-150 ease-instrument sm:h-7 ${
                !isOffline
                  ? 'bg-raised text-ink-primary shadow-btn-top'
                  : 'text-ink-muted hover:text-ink-secondary'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${!isOffline ? 'bg-safe' : 'bg-ink-muted/40'}`}
              />
              <span>Base camp</span>
            </button>
            <button
              aria-pressed={isOffline}
              onClick={() => onToggleMode('FIELD_OFFLINE')}
              className={`flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors duration-150 ease-instrument sm:h-7 ${
                isOffline
                  ? 'bg-caution-dim text-ink-primary shadow-btn-top'
                  : 'text-ink-muted hover:text-ink-secondary'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isOffline ? 'bg-caution' : 'bg-ink-muted/40'
                }`}
              />
              <span>Field offline</span>
            </button>
          </div>

          {/* Pending Conflicts Shortcut */}
          {unsyncedReportCount > 0 && (
            <button
              onClick={onGoToCloudSync}
              className="btn-secondary flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium sm:h-8"
              title="Open Cloud command to reconcile pending offline reports"
            >
              <UploadCloudIcon size={14} className="text-caution" />
              <span className="tabular">
                {isOffline
                  ? `${unsyncedReportCount} queued`
                  : `Reconcile ${unsyncedReportCount}`}
              </span>
            </button>
          )}

          {/* Primary Action: Download Field Pack */}
          <button
            onClick={onDownloadFieldPack}
            disabled={downloadingPack}
            title="Snapshot aid camps, beds, protocols, and warm up on-device Gemini Nano 4 before departing signal range"
            className="btn-primary flex h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-medium disabled:opacity-60 sm:h-8"
          >
            {snapshot && !downloadingPack ? (
              <CheckIcon size={14} />
            ) : (
              <DownloadIcon size={14} />
            )}
            <span className="tabular">
              {downloadingPack
                ? nanoDownloadProgress !== null
                  ? `Nano 4 ${nanoDownloadProgress}%`
                  : 'Packing DB...'
                : snapshot
                  ? 'Refresh pack'
                  : 'Download field pack'}
            </span>
          </button>

          {/* Demo Guide Trigger */}
          <button
            onClick={onToggleDemoGuide}
            aria-expanded={demoGuideOpen}
            className={`btn-secondary flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium sm:h-8 ${
              demoGuideOpen ? 'border-strong bg-raised-hover text-ink-primary' : 'text-ink-secondary'
            }`}
            title="Open 3-minute guided walkthrough"
          >
            <ClapperboardIcon size={14} className="text-ink-muted" />
            <span className="hidden sm:inline">Demo guide</span>
          </button>

          {/* Diagnostics & Firebase Setup */}
          <button
            onClick={onOpenDiagnostics}
            className="btn-secondary flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-ink-secondary sm:h-8"
            title="Inspect Firebase AI Logic, App Check, Remote Config, and Gemini Nano 4 status"
          >
            <SettingsIcon size={14} className="text-ink-muted" />
            <span className="hidden xl:inline">Setup</span>
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                firebaseConfigured || nanoStatus.availability === 'available'
                  ? 'bg-safe'
                  : 'bg-caution'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Compact Mobile/Tablet Navigation Row */}
      <nav
        aria-label="Primary workspace mobile"
        role="tablist"
        className="scrollbar-none flex items-center gap-1 overflow-x-auto border-t border-hairline px-3 py-1.5 lg:hidden"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => onSelectTab(tab.id)}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors duration-150 ease-instrument ${
                active
                  ? 'bg-raised text-ink-primary'
                  : 'text-ink-secondary hover:bg-raised/60 hover:text-ink-primary'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="tabular font-mono text-[11px] text-caution">{tab.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Single-Line Emergency Alert Strip with Alert Cycler */}
      {currentAlert && (
        <div
          role="alert"
          className={`border-t px-4 lg:px-6 ${
            currentAlert.severity === 'CRITICAL'
              ? 'border-hazard/30 bg-hazard-dim/85 text-ink-primary'
              : 'border-caution/25 bg-caution-dim/70 text-ink-primary'
          }`}
        >
          <div className="mx-auto flex h-9 max-w-[1600px] items-center justify-between gap-3 text-xs">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  currentAlert.severity === 'CRITICAL' ? 'bg-hazard' : 'bg-caution'
                }`}
              />
              <span className="min-w-0 truncate font-medium text-ink-primary md:shrink-0 md:overflow-visible">
                {currentAlert.title}
              </span>
              <span className="hidden min-w-0 truncate text-ink-secondary md:inline">
                {currentAlert.message}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {sortedAlerts.length > 1 && (
                <button
                  onClick={() => setAlertIndex((i) => (i + 1) % sortedAlerts.length)}
                  className="tabular rounded px-1.5 py-0.5 font-mono text-[11px] text-ink-secondary transition-colors duration-150 hover:bg-ink-primary/10 hover:text-ink-primary"
                  title="Show next active alert"
                >
                  {(alertIndex % sortedAlerts.length) + 1}/{sortedAlerts.length} next
                </button>
              )}
              <button
                onClick={() => onDismissAlert(currentAlert.id)}
                className="flex h-7 w-7 items-center justify-center rounded text-ink-secondary transition-colors duration-150 hover:bg-ink-primary/10 hover:text-ink-primary"
                aria-label="Acknowledge alert"
                title="Acknowledge alert"
              >
                <XIcon size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
