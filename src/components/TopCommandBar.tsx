import React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cloud,
  CloudOff,
  Cpu,
  Download,
  Map as MapIcon,
  MessageSquareHeart,
  Radio,
  Settings,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react';
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
  appCheckActive: boolean;
  activeAlerts: EmergencyAlert[];
  onDismissAlert: (id: string) => void;
  onOpenDiagnostics: () => void;
  onDeviceCount: number;
  inCloudCount: number;
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
  appCheckActive,
  activeAlerts,
  onDismissAlert,
  onOpenDiagnostics,
  onDeviceCount,
  inCloudCount,
}) => {
  const isOffline = operatingMode === 'FIELD_OFFLINE';
  const unackAlerts = activeAlerts.filter((a) => !a.acknowledged);
  const criticalAlert = unackAlerts.find((a) => a.severity === 'CRITICAL') ?? unackAlerts[0];

  const tabs: Array<{ id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'map', label: 'Tactical Aid Map', icon: <MapIcon className="h-4 w-4" /> },
    { id: 'field', label: 'Field AI & Protocols', icon: <MessageSquareHeart className="h-4 w-4" /> },
    { id: 'mesh', label: 'Local Mesh Sync', icon: <Radio className="h-4 w-4" /> },
    {
      id: 'cloud',
      label: 'Cloud Command',
      icon: <Cloud className="h-4 w-4" />,
      badge: unsyncedReportCount > 0 ? unsyncedReportCount : undefined,
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/95 backdrop-blur-md">
      {/* Main Top Command Strip */}
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/40 bg-gradient-to-br from-red-500/20 via-slate-900 to-cyan-500/20 shadow-lg shadow-red-950/30">
            <Activity className="h-5 w-5 text-red-400" />
            <span
              className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-slate-950 ${
                isOffline ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold tracking-tight text-white sm:text-base">
                CRISIS CONNECTION
              </h1>
              <span className="hidden rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-cyan-300 md:inline">
                FIREBASE AI LOGIC · HYBRID
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Closed-Loop Humanitarian Aid Network · On-Device Nano 4 + Cloud Gemini
            </p>
          </div>
        </div>

        {/* Closed-Loop Operating Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/90 p-0.5">
            <button
              onClick={() => onToggleMode('BASE_CAMP_ONLINE')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all ${
                !isOffline
                  ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cloud className="h-3.5 w-3.5" />
              <span>Base Camp (Online)</span>
            </button>
            <button
              onClick={() => onToggleMode('FIELD_OFFLINE')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all ${
                isOffline
                  ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CloudOff className="h-3.5 w-3.5" />
              <span>In Field (Offline)</span>
            </button>
          </div>

          {/* Pre-Departure Download Field Pack Button */}
          <button
            onClick={onDownloadFieldPack}
            disabled={downloadingPack}
            title="Downloads latest Aid Camps, Beds, Safety Levels, CPR/Triage Protocols & initializes on-device Gemini Nano 4 before departing base camp"
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/25 disabled:opacity-60"
          >
            <Download className={`h-3.5 w-3.5 ${downloadingPack ? 'animate-bounce' : ''}`} />
            <span>
              {downloadingPack
                ? nanoDownloadProgress !== null
                  ? `Warming Nano 4 (${nanoDownloadProgress}%)`
                  : 'Packing Offline DB...'
                : snapshot
                  ? 'Refresh Field Pack'
                  : 'Download Field Pack'}
            </span>
            {snapshot && !downloadingPack && (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            )}
          </button>

          {/* Upload Pending Outbox Button */}
          {unsyncedReportCount > 0 && (
            <button
              onClick={onGoToCloudSync}
              className="flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/20 px-3 py-1.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/30"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>
                {isOffline
                  ? `${unsyncedReportCount} Queued`
                  : `Resolve ${unsyncedReportCount} Conflict${unsyncedReportCount > 1 ? 's' : ''}`}
              </span>
            </button>
          )}

          {/* Diagnostics & Firebase Setup Button */}
          <button
            onClick={onOpenDiagnostics}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
            title="Inspect Firebase AI Logic, App Check, Remote Config & Chrome Gemini Nano 4 status"
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Firebase & AI</span>
            <span
              className={`h-2 w-2 rounded-full ${
                firebaseConfigured || nanoStatus.availability === 'available'
                  ? 'bg-emerald-400'
                  : 'bg-amber-400'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Navigation Tabs + Live Hybrid Telemetry Pills */}
      <div className="border-t border-slate-800/70 bg-slate-900/50">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4">
          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <span className={active ? 'text-cyan-400' : 'text-slate-500'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className="rounded-full bg-violet-500/30 px-1.5 py-0.5 font-mono text-[10px] font-bold text-violet-200">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Compact Telemetry Strip */}
          <div className="hidden items-center gap-3 py-1 text-[11px] text-slate-400 lg:flex">
            <span className="flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5 text-emerald-400" />
              Nano 4:{' '}
              <strong
                className={
                  nanoStatus.availability === 'available'
                    ? 'text-emerald-300'
                    : nanoStatus.availability === 'downloadable'
                      ? 'text-cyan-300'
                      : 'text-slate-300'
                }
              >
                {nanoStatus.availability.toUpperCase()}
              </strong>
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1">
              <ShieldCheck
                className={`h-3.5 w-3.5 ${appCheckActive ? 'text-emerald-400' : 'text-slate-500'}`}
              />
              App Check:{' '}
              <strong className={appCheckActive ? 'text-emerald-300' : 'text-slate-300'}>
                {appCheckActive ? 'ENFORCED' : 'SANDBOX'}
              </strong>
            </span>
            <span className="text-slate-700">|</span>
            <span className="font-mono text-slate-300">
              AI Calls: <span className="text-emerald-300">{onDeviceCount} local</span> /{' '}
              <span className="text-violet-300">{inCloudCount} cloud</span>
            </span>
          </div>
        </div>
      </div>

      {/* Emergency Broadcast Banner */}
      {criticalAlert && (
        <div
          className={`border-t px-4 py-2 ${
            criticalAlert.severity === 'CRITICAL'
              ? 'border-red-500/50 bg-red-950/75 text-red-100'
              : 'border-amber-500/40 bg-amber-950/50 text-amber-100'
          }`}
        >
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle
                className={`h-4 w-4 shrink-0 ${
                  criticalAlert.severity === 'CRITICAL'
                    ? 'animate-pulse text-red-400'
                    : 'text-amber-400'
                }`}
              />
              <div>
                <span className="mr-2 rounded bg-black/30 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider">
                  {criticalAlert.severity} ALERT · {criticalAlert.propagatedViaMesh ? 'CLOUD + MESH' : 'LOCAL'}
                </span>
                <strong className="mr-1.5 font-semibold">{criticalAlert.title}:</strong>
                <span className="opacity-90">{criticalAlert.message}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {unackAlerts.length > 1 && (
                <span className="rounded-full bg-black/30 px-2 py-0.5 font-mono text-[10px]">
                  +{unackAlerts.length - 1} more
                </span>
              )}
              <button
                onClick={() => onDismissAlert(criticalAlert.id)}
                className="rounded p-1 hover:bg-white/10"
                title="Acknowledge alert"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
