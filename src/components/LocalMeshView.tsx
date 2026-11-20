import React from 'react';
import {
  BatteryIcon,
  ClockIcon,
  ExternalLinkIcon,
  RefreshIcon,
  SignalIcon,
  ZapIcon,
} from './icons';
import { AidCamp, MeshPeer, MeshSyncEvent, OperatingMode } from '../types/crisis';
import { AdaptiveCycleResult } from '../services/meshSync';
import { UncertaintyMeter } from './UncertaintyMeter';

interface LocalMeshViewProps {
  deviceCallsign: string;
  peers: MeshPeer[];
  syncEvents: MeshSyncEvent[];
  adaptiveCycle: AdaptiveCycleResult;
  secondsToNextCycle: number;
  operatingMode: OperatingMode;
  camps: AidCamp[];
  onTriggerManualGossip: () => void;
  onSimulateIncomingPeerReport: () => void;
}

const regimeMeta: Record<
  AdaptiveCycleResult['regime'],
  { label: string; dot: string; tone: string }
> = {
  EMERGENCY_BURST: { label: 'Emergency burst', dot: 'bg-hazard', tone: 'text-hazard' },
  DIVERGENCE_CATCHUP: { label: 'Divergence catchup', dot: 'bg-caution', tone: 'text-caution' },
  NORMAL_PATROL: { label: 'Normal patrol', dot: 'bg-accent', tone: 'text-accent' },
  BATTERY_SAVER: { label: 'Battery saver', dot: 'bg-safe', tone: 'text-safe' },
};

export const LocalMeshView: React.FC<LocalMeshViewProps> = ({
  deviceCallsign,
  peers,
  syncEvents,
  adaptiveCycle,
  secondsToNextCycle,
  operatingMode,
  camps,
  onTriggerManualGossip,
  onSimulateIncomingPeerReport,
}) => {
  const regime = regimeMeta[adaptiveCycle.regime];

  const openSecondDeviceTab = () => {
    window.open(window.location.href, '_blank', 'noopener');
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      {/* Left 7 Columns: Adaptive Cycle Engine, Peer Topology Schematic, Handsets */}
      <div className="flex flex-col gap-4 xl:col-span-7">
        {/* Adaptive X-Cycle Engine */}
        <section className="rounded-xl border border-hairline bg-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-sm font-semibold text-ink-primary">
                  Adaptive peer mesh sync
                </h2>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                  <span className={`h-1.5 w-1.5 rounded-full ${regime.dot}`} />
                  <span className={regime.tone}>{regime.label}</span>
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                {adaptiveCycle.reason}
              </p>
            </div>

            <div className="grid grid-cols-2 divide-x divide-hairline rounded-lg border border-hairline bg-recessed">
              <div className="px-3.5 py-2 text-right">
                <div className="text-[11px] text-ink-muted">Cycle X</div>
                <div className="tabular mt-0.5 font-mono text-base font-medium text-ink-primary">
                  {adaptiveCycle.cycleSec} s
                </div>
              </div>
              <div className="px-3.5 py-2 text-right">
                <div className="text-[11px] text-ink-muted">Next sync</div>
                <div className="tabular mt-0.5 font-mono text-base font-medium text-safe">
                  {secondsToNextCycle} s
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={onTriggerManualGossip}
              className="btn-primary flex h-10 items-center gap-1.5 rounded-lg px-3.5 text-xs font-medium sm:h-9"
            >
              <RefreshIcon size={14} />
              <span>Run mesh gossip</span>
            </button>
            <button
              onClick={onSimulateIncomingPeerReport}
              className="btn-secondary flex h-10 items-center gap-1.5 rounded-lg px-3.5 text-xs font-medium sm:h-9"
            >
              <ZapIcon size={14} className="text-ink-muted" />
              <span>Simulate peer update</span>
            </button>
            <button
              onClick={openSecondDeviceTab}
              className="btn-secondary flex h-10 items-center gap-1.5 rounded-lg px-3.5 text-xs font-medium sm:h-9"
              title="Opens a second browser tab linked over BroadcastChannel for live multi-handset offline sync"
            >
              <ExternalLinkIcon size={14} className="text-ink-muted" />
              <span>Open 2nd handset tab</span>
            </button>
          </div>
        </section>

        {/* Peer Topology Schematic */}
        <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-4 py-3 text-xs">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-ink-primary">Handset mesh topology</h3>
              <span className="tabular font-mono text-[11px] text-ink-muted">
                {peers.length + 1} nodes ·{' '}
                {operatingMode === 'FIELD_OFFLINE' ? 'No cloud uplink' : 'Cloud and mesh'}
              </span>
            </div>
            <span className="font-mono text-[11px] text-ink-secondary">
              Unit {deviceCallsign}
            </span>
          </div>

          <div className="bg-[#0e100f] p-3">
            <svg
              viewBox="0 0 680 300"
              role="img"
              aria-label="Local peer handset mesh topology"
              className="aspect-[680/300] w-full rounded-lg border border-hairline sm:aspect-auto sm:h-[272px]"
            >
              <defs>
                <pattern id="meshGrid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path
                    d="M 32 0 L 0 0 0 32"
                    fill="none"
                    stroke="#ededeb"
                    strokeOpacity="0.035"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>

              <rect width="680" height="300" fill="url(#meshGrid)" />

              {peers.map((peer, idx) => {
                const positions = [
                  { x: 135, y: 76 },
                  { x: 545, y: 76 },
                  { x: 155, y: 230 },
                  { x: 525, y: 230 },
                ];
                const pt = positions[idx % positions.length];
                const midX = (340 + pt.x) / 2;
                const midY = (150 + pt.y) / 2;
                const linkColor = peer.isLiveTab ? '#4cc38a' : '#4ea1f3';

                return (
                  <g key={peer.id}>
                    <line
                      x1={340}
                      y1={150}
                      x2={pt.x}
                      y2={pt.y}
                      stroke={linkColor}
                      strokeOpacity={peer.isLiveTab ? 0.75 : 0.45}
                      strokeWidth={peer.isLiveTab ? 2 : 1.5}
                      strokeDasharray="5 4"
                    />
                    <rect
                      x={midX - 28}
                      y={midY - 9}
                      width="56"
                      height="17"
                      rx="3"
                      fill="#141514"
                      stroke="#2c2e2c"
                    />
                    <text
                      x={midX}
                      y={midY + 3}
                      fill="#a5a7a4"
                      fontSize="9"
                      fontFamily="'IBM Plex Mono', monospace"
                      textAnchor="middle"
                    >
                      {peer.signalStrength}% RSSI
                    </text>

                    <rect
                      x={pt.x - 62}
                      y={pt.y - 26}
                      width="124"
                      height="52"
                      rx="6"
                      fill="#171817"
                      stroke={peer.isLiveTab ? '#4cc38a' : '#353835'}
                      strokeWidth="1.5"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 6}
                      fill="#ededeb"
                      fontSize="11"
                      fontWeight="600"
                      fontFamily="'IBM Plex Mono', monospace"
                      textAnchor="middle"
                    >
                      {peer.callsign}
                    </text>
                    <text
                      x={pt.x}
                      y={pt.y + 8}
                      fill="#a5a7a4"
                      fontSize="9.5"
                      textAnchor="middle"
                    >
                      {peer.isLiveTab ? 'Live tab handset' : peer.role}
                    </text>
                    <text
                      x={pt.x}
                      y={pt.y + 20}
                      fill="#828581"
                      fontSize="8.5"
                      fontFamily="'IBM Plex Mono', monospace"
                      textAnchor="middle"
                    >
                      v{peer.dbVersion} · {peer.batteryPct}% bat
                    </text>
                  </g>
                );
              })}

              {/* Center Node: This Handset */}
              <g>
                <circle
                  cx={340}
                  cy={150}
                  r={64}
                  fill="none"
                  stroke="#4ea1f3"
                  strokeOpacity="0.22"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                />
                <rect
                  x={272}
                  y={120}
                  width="136"
                  height="60"
                  rx="8"
                  fill="#17202a"
                  stroke="#4ea1f3"
                  strokeWidth="1.75"
                />
                <text
                  x={340}
                  y={142}
                  fill="#ededeb"
                  fontSize="12"
                  fontWeight="600"
                  fontFamily="'IBM Plex Mono', monospace"
                  textAnchor="middle"
                >
                  {deviceCallsign}
                </text>
                <text x={340} y={157} fill="#a5a7a4" fontSize="9.5" textAnchor="middle">
                  This handset · Nano 4
                </text>
                <text
                  x={340}
                  y={170}
                  fill="#8cbef2"
                  fontSize="8.5"
                  fontFamily="'IBM Plex Mono', monospace"
                  textAnchor="middle"
                >
                  {camps.length} camps cached
                </text>
              </g>
            </svg>
          </div>
        </section>

        {/* Nearby Peer Handsets */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {peers.map((peer) => (
            <div
              key={peer.id}
              className="rounded-xl border border-hairline bg-surface p-3.5 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-medium text-ink-primary">{peer.callsign}</span>
                <span className="tabular font-mono text-[11px] text-ink-muted">
                  v{peer.dbVersion}
                </span>
              </div>
              <div className="mt-1 truncate text-xs text-ink-secondary">{peer.role}</div>
              <div className="mt-3 flex items-center justify-between border-t border-hairline pt-2.5 font-mono text-[11px] text-ink-secondary">
                <span className="tabular inline-flex items-center gap-1">
                  <SignalIcon size={12} className="text-ink-muted" />
                  {peer.signalStrength}%
                </span>
                <span className="tabular inline-flex items-center gap-1">
                  <BatteryIcon
                    size={12}
                    className={peer.batteryPct < 35 ? 'text-caution' : 'text-ink-muted'}
                  />
                  {peer.batteryPct}%
                </span>
                <span className="tabular text-ink-muted">{peer.pendingUpdates} diff</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right 5 Columns: Gossip Ledger + Lamport Version Vector */}
      <div className="flex flex-col gap-4 xl:col-span-5">
        <section className="rounded-xl border border-hairline bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-primary">Peer gossip ledger</h3>
            <span className="tabular font-mono text-[11px] text-ink-muted">
              {syncEvents.length} events
            </span>
          </div>

          <div
            aria-live="polite"
            className="max-h-[360px] overflow-y-auto rounded-lg border border-hairline bg-recessed"
          >
            {syncEvents.length === 0 ? (
              <p className="p-4 text-xs text-ink-secondary">
                Waiting for the next sync cycle. Run mesh gossip now or open a second handset tab to test peer relay.
              </p>
            ) : (
              <div className="divide-y divide-hairline">
                {syncEvents.map((ev) => (
                  <div key={ev.id} className="p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-medium text-ink-primary">
                        {ev.fromPeer} ⇄ {ev.toPeer}
                      </span>
                      <span className="font-mono text-[11px] text-ink-muted">
                        {ev.channel === 'BROADCAST_CHANNEL' ? 'Live tab' : 'Mesh relay'}
                      </span>
                    </div>
                    <p className="mt-1 leading-relaxed text-ink-secondary">{ev.summary}</p>
                    <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-ink-muted">
                      <span className="tabular inline-flex items-center gap-1">
                        <ClockIcon size={12} />
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="tabular">
                        X={ev.cycleIntervalSec} s · {ev.recordsExchanged} rec
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Local Lamport Version Vector */}
        <section className="rounded-xl border border-hairline bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-primary">Lamport version vector</h3>
            <span className="text-xs text-ink-muted">Staleness check</span>
          </div>

          <div className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline bg-recessed text-xs">
            {camps.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0 truncate">
                  <span className="font-mono text-[11px] text-ink-muted">{c.code}</span>{' '}
                  <span className="font-medium text-ink-primary">{c.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="tabular font-mono text-[11px] text-ink-muted">
                    v{c.version}
                  </span>
                  <UncertaintyMeter value={c.uncertaintyScore} compact />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
