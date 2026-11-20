import React from 'react';
import {
  Activity,
  Battery,
  Clock,
  ExternalLink,
  Radio,
  RefreshCw,
  Signal,
  Smartphone,
  Zap,
} from 'lucide-react';
import { AidCamp, MeshPeer, MeshSyncEvent, OperatingMode } from '../types/crisis';
import { AdaptiveCycleResult } from '../services/meshSync';

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
  const regimeStyles: Record<AdaptiveCycleResult['regime'], string> = {
    EMERGENCY_BURST: 'border-red-500/50 bg-red-500/15 text-red-300',
    DIVERGENCE_CATCHUP: 'border-amber-500/50 bg-amber-500/15 text-amber-300',
    NORMAL_PATROL: 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300',
    BATTERY_SAVER: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300',
  };

  const openSecondDeviceTab = () => {
    window.open(window.location.href, '_blank', 'noopener');
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      {/* Left 7 Columns: Adaptive X-Cycle Engine & Interactive Peer Mesh Topology */}
      <div className="flex flex-col gap-4 xl:col-span-7">
        {/* Adaptive X-Cycle Banner (Whiteboard: "In X cycle (to be determined by algorithm), phones communicate to locally update databases") */}
        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">
                  Adaptive X-Cycle Peer-to-Peer Local Mesh
                </h2>
                <span
                  className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${
                    regimeStyles[adaptiveCycle.regime]
                  }`}
                >
                  {adaptiveCycle.regime.replace('_', ' ')}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300">{adaptiveCycle.reason}</p>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-center font-mono">
              <div>
                <div className="text-[10px] text-slate-400">CYCLE X</div>
                <div className="text-lg font-extrabold text-cyan-300">
                  {adaptiveCycle.cycleSec}s
                </div>
              </div>
              <div className="h-7 w-px bg-slate-800" />
              <div>
                <div className="text-[10px] text-slate-400">NEXT SYNC</div>
                <div className="text-lg font-extrabold text-emerald-300">
                  {secondsToNextCycle}s
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={onTriggerManualGossip}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-cyan-500"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Run Mesh Gossip Now</span>
            </button>
            <button
              onClick={onSimulateIncomingPeerReport}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3.5 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/25"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Simulate Peer Offline Update</span>
            </button>
            <button
              onClick={openSecondDeviceTab}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-500/50 hover:text-cyan-200"
              title="Opens a second tab linked via real BroadcastChannel so you can demo live multi-device offline mesh sync!"
            >
              <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
              <span>Open 2nd Field Handset Tab (Live BroadcastChannel)</span>
            </button>
          </div>
        </div>

        {/* Visual Mesh Topology SVG */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200">
              ACTIVE HANDSET MESH TOPOLOGY ({peers.length + 1} NODES ·{' '}
              {operatingMode === 'FIELD_OFFLINE' ? 'NO CLOUD UPLINK' : 'CLOUD + MESH'})
            </span>
            <span className="font-mono text-[11px] text-cyan-300">
              THIS HANDSET: {deviceCallsign}
            </span>
          </div>

          <svg viewBox="0 0 680 300" className="tactical-grid h-[270px] w-full rounded-xl border border-slate-800/80">
            {/* Links between This Handset (center) and nearby peers */}
            {peers.map((peer, idx) => {
              const positions = [
                { x: 140, y: 78 },
                { x: 540, y: 82 },
                { x: 165, y: 235 },
                { x: 525, y: 230 },
              ];
              const pt = positions[idx % positions.length];
              return (
                <g key={peer.id}>
                  <line
                    x1={340}
                    y1={150}
                    x2={pt.x}
                    y2={pt.y}
                    stroke={peer.isLiveTab ? '#34d399' : '#06b6d4'}
                    strokeWidth={peer.isLiveTab ? 3 : 2}
                    strokeDasharray="6 5"
                    opacity={0.7}
                  />
                  {/* Signal label */}
                  <rect
                    x={(340 + pt.x) / 2 - 26}
                    y={(150 + pt.y) / 2 - 9}
                    width="52"
                    height="16"
                    rx="4"
                    fill="#0f172a"
                    stroke="#1e293b"
                  />
                  <text
                    x={(340 + pt.x) / 2}
                    y={(150 + pt.y) / 2 + 2}
                    fill="#67e8f9"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {peer.signalStrength}% RSSI
                  </text>

                  {/* Peer Phone Box */}
                  <rect
                    x={pt.x - 56}
                    y={pt.y - 26}
                    width="112"
                    height="52"
                    rx="10"
                    fill="#0f172a"
                    stroke={peer.isLiveTab ? '#10b981' : '#0891b2'}
                    strokeWidth="2"
                  />
                  <text
                    x={pt.x}
                    y={pt.y - 6}
                    fill="#f8fafc"
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {peer.callsign}
                  </text>
                  <text
                    x={pt.x}
                    y={pt.y + 9}
                    fill="#94a3b8"
                    fontSize="9"
                    textAnchor="middle"
                  >
                    {peer.isLiveTab ? 'LIVE TAB PEER' : peer.role}
                  </text>
                  <text
                    x={pt.x}
                    y={pt.y + 20}
                    fill="#34d399"
                    fontSize="8.5"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    DB v{peer.dbVersion} · {peer.batteryPct}%⚡
                  </text>
                </g>
              );
            })}

            {/* Center Node: This Device */}
            <g>
              <circle
                cx={340}
                cy={150}
                r={58}
                fill="none"
                stroke="#22d3ee"
                strokeOpacity="0.3"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <rect
                x={276}
                y={120}
                width="128"
                height="60"
                rx="12"
                fill="#083344"
                stroke="#22d3ee"
                strokeWidth="2.5"
              />
              <text
                x={340}
                y={142}
                fill="#ffffff"
                fontSize="12"
                fontWeight="800"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {deviceCallsign}
              </text>
              <text
                x={340}
                y={157}
                fill="#67e8f9"
                fontSize="9.5"
                textAnchor="middle"
              >
                THIS DEVICE (NANO 4)
              </text>
              <text
                x={340}
                y={170}
                fill="#a5f3fc"
                fontSize="8.5"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {camps.length} CAMPS CACHED
              </text>
            </g>
          </svg>
        </div>

        {/* Peer Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {peers.map((peer) => (
            <div
              key={peer.id}
              className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-mono font-bold text-white">
                  <Smartphone className="h-3.5 w-3.5 text-cyan-400" />
                  {peer.callsign}
                </span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                  v{peer.dbVersion}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">{peer.role}</div>
              <div className="mt-2.5 flex items-center justify-between font-mono text-[10px] text-slate-300">
                <span className="flex items-center gap-1">
                  <Signal className="h-3 w-3 text-cyan-400" /> {peer.signalStrength}%
                </span>
                <span className="flex items-center gap-1">
                  <Battery
                    className={`h-3 w-3 ${
                      peer.batteryPct < 35 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  />{' '}
                  {peer.batteryPct}%
                </span>
                <span className="text-slate-400">{peer.pendingUpdates} diff</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right 5 Columns: Live Mesh Gossip Ledger + Version Vectors */}
      <div className="flex flex-col gap-4 xl:col-span-5">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-white">
              <Activity className="h-4 w-4 text-emerald-400" />
              Peer Gossip Sync Ledger
            </h3>
            <span className="font-mono text-[10px] text-slate-400">
              {syncEvents.length} events
            </span>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {syncEvents.length === 0 ? (
              <p className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center text-xs text-slate-400">
                Waiting for first X-cycle peer gossip... Click &quot;Run Mesh Gossip Now&quot; or open a 2nd browser tab!
              </p>
            ) : (
              syncEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-cyan-300">
                      {ev.fromPeer} ⇄ {ev.toPeer}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[9.5px] font-semibold ${
                        ev.channel === 'BROADCAST_CHANNEL'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {ev.channel === 'BROADCAST_CHANNEL' ? 'LIVE TAB MESH' : 'MESH RELAY'}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-300">{ev.summary}</p>
                  <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                    <span>
                      X={ev.cycleIntervalSec}s · {ev.recordsExchanged} records
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Local DB Version Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            Local Lamport Version Vector (Staleness Detection)
          </h3>
          <div className="space-y-1.5 text-xs">
            {camps.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/60 px-3 py-2"
              >
                <div>
                  <span className="font-mono font-bold text-cyan-300">{c.code}</span>{' '}
                  <span className="text-slate-200">{c.name}</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="text-slate-400">v{c.version}</span>
                  <span
                    className={
                      c.uncertaintyScore >= 50 ? 'text-amber-300' : 'text-emerald-300'
                    }
                  >
                    Unc {c.uncertaintyScore}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
