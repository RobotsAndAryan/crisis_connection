import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  BedDouble,
  Compass,
  Crosshair,
  Flame,
  Navigation,
  Radio,
  Route,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import {
  AidCamp,
  Coordinates,
  HazardZone,
  InferenceSourceLabel,
  MeshPeer,
  OperatingMode,
} from '../types/crisis';
import { TACTICAL_MAP_EDGES, TACTICAL_MAP_NODES } from '../data/seedData';
import { computeRouteToCamp, findBestCampRoutes } from '../services/pathfinding';
import { InferenceBadge } from './InferenceBadge';

interface TacticalMapViewProps {
  camps: AidCamp[];
  hazards: HazardZone[];
  peers: MeshPeer[];
  workerPos: Coordinates;
  onMoveWorker: (pos: Coordinates) => void;
  dangerWeight: number;
  onChangeDangerWeight: (w: number) => void;
  operatingMode: OperatingMode;
  onMarkCampDestroyed: (campId: string) => void;
  onAddHazardZone: (coords: Coordinates) => void;
  onAskMapLocally: (query: string) => Promise<{
    text: string;
    inferenceSource: InferenceSourceLabel;
    latencyMs: number;
    highlightedCampId?: string;
  }>;
  onOpenReportForCamp: (campId: string) => void;
}

const statusColors: Record<AidCamp['status'], { ring: string; fill: string; badge: string }> = {
  ACTIVE: {
    ring: '#10b981',
    fill: '#064e3b',
    badge: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  },
  OVERCROWDED: {
    ring: '#f59e0b',
    fill: '#78350f',
    badge: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  },
  DAMAGED: {
    ring: '#f97316',
    fill: '#7c2d12',
    badge: 'border-orange-500/40 bg-orange-500/15 text-orange-300',
  },
  DESTROYED: {
    ring: '#ef4444',
    fill: '#450a0a',
    badge: 'border-red-500/50 bg-red-500/20 text-red-300',
  },
};

export const TacticalMapView: React.FC<TacticalMapViewProps> = ({
  camps,
  hazards,
  peers,
  workerPos,
  onMoveWorker,
  dangerWeight,
  onChangeDangerWeight,
  operatingMode,
  onMarkCampDestroyed,
  onAddHazardZone,
  onAskMapLocally,
  onOpenReportForCamp,
}) => {
  const [selectedCampId, setSelectedCampId] = useState<string>('camp-east');
  const [minBeds, setMinBeds] = useState<number>(1);
  const [showMeshRings, setShowMeshRings] = useState<boolean>(true);
  const [dropHazardMode, setDropHazardMode] = useState<boolean>(false);
  const [mapQuery, setMapQuery] = useState<string>('');
  const [mapAnswer, setMapAnswer] = useState<{
    text: string;
    inferenceSource: InferenceSourceLabel;
    latencyMs: number;
  } | null>(null);
  const [askingMap, setAskingMap] = useState<boolean>(false);

  const routing = useMemo(
    () => findBestCampRoutes(workerPos, camps, hazards, dangerWeight, minBeds),
    [workerPos, camps, hazards, dangerWeight, minBeds]
  );

  const selectedCamp = camps.find((c) => c.id === selectedCampId) ?? camps[0];

  const routeToSelectedSafe = useMemo(
    () =>
      selectedCamp && selectedCamp.status !== 'DESTROYED'
        ? computeRouteToCamp(workerPos, selectedCamp, hazards, Math.max(0.25, dangerWeight))
        : null,
    [workerPos, selectedCamp, hazards, dangerWeight]
  );

  const routeToSelectedShort = useMemo(
    () =>
      selectedCamp && selectedCamp.status !== 'DESTROYED'
        ? computeRouteToCamp(workerPos, selectedCamp, hazards, 0)
        : null,
    [workerPos, selectedCamp, hazards]
  );

  const nodeById = useMemo(
    () => new Map(TACTICAL_MAP_NODES.map((n) => [n.id, n])),
    []
  );

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 600);
    const clamped = {
      x: Math.max(40, Math.min(960, x)),
      y: Math.max(40, Math.min(560, y)),
    };
    if (dropHazardMode) {
      onAddHazardZone(clamped);
      setDropHazardMode(false);
    } else {
      onMoveWorker(clamped);
    }
  };

  const handleQuickMapAsk = async (promptText: string) => {
    const q = promptText.trim();
    if (!q || askingMap) return;
    setAskingMap(true);
    setMapQuery(q);
    try {
      const res = await onAskMapLocally(q);
      setMapAnswer({
        text: res.text,
        inferenceSource: res.inferenceSource,
        latencyMs: res.latencyMs,
      });
      if (res.highlightedCampId) {
        setSelectedCampId(res.highlightedCampId);
      }
    } finally {
      setAskingMap(false);
    }
  };

  const toPolyline = (pts: Coordinates[]) => pts.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      {/* Left / Main Interactive Tactical Map */}
      <div className="flex flex-col gap-3 xl:col-span-8">
        {/* Local Map Quick Query Bar (Whiteboard: 'Locally access Map: e.g. Tell me where the closest aid camp is') */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400" />
              <input
                type="text"
                value={mapQuery}
                onChange={(e) => setMapQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickMapAsk(mapQuery)}
                placeholder='Ask local map AI: "Tell me where the closest safe aid camp is with available beds"'
                className="w-full rounded-xl border border-slate-700 bg-slate-950/90 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() =>
                handleQuickMapAsk(
                  mapQuery || 'Tell me where the closest safe aid camp is with available beds'
                )
              }
              disabled={askingMap}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-cyan-950/50 transition hover:brightness-110 disabled:opacity-60"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{askingMap ? 'Routing...' : 'Ask Local AI'}</span>
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-500">Quick field queries:</span>
            {[
              'Tell me where the closest safe aid camp is',
              'Which camp has the most trauma kits and clean water?',
              'Why should I avoid the direct route to Harbor Bridge?',
            ].map((sample) => (
              <button
                key={sample}
                onClick={() => handleQuickMapAsk(sample)}
                className="rounded-full border border-slate-700/80 bg-slate-800/70 px-2.5 py-0.5 text-slate-300 transition hover:border-cyan-500/50 hover:text-cyan-200"
              >
                {sample}
              </button>
            ))}
          </div>

          {mapAnswer && (
            <div className="mt-3 rounded-xl border border-cyan-500/30 bg-slate-950/90 p-3">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                  Local Map AI Recommendation
                </span>
                <InferenceBadge
                  source={mapAnswer.inferenceSource}
                  latencyMs={mapAnswer.latencyMs}
                />
              </div>
              <p className="whitespace-pre-line text-xs leading-relaxed text-slate-200">
                {mapAnswer.text}
              </p>
            </div>
          )}
        </div>

        {/* Interactive Offline-Capable SVG Tactical Map */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
          {/* Top overlay bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-900/80 px-4 py-2 text-xs">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-cyan-400" />
              <span className="font-bold text-slate-100">
                SECTOR MERIDIAN — OFFLINE TACTICAL MAP
              </span>
              {operatingMode === 'FIELD_OFFLINE' && (
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-300">
                  <WifiOff className="h-3 w-3" /> LOCAL CACHED MAP
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMeshRings}
                  onChange={(e) => setShowMeshRings(e.target.checked)}
                  className="accent-cyan-500"
                />
                <span>Local Mesh Rings</span>
              </label>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => setDropHazardMode((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-semibold transition ${
                  dropHazardMode
                    ? 'animate-pulse border-red-500 bg-red-500/20 text-red-200'
                    : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-red-500/50 hover:text-red-200'
                }`}
              >
                <Flame className="h-3 w-3 text-red-400" />
                <span>{dropHazardMode ? 'Click Map to Drop Hazard!' : '+ Drop Hazard'}</span>
              </button>
              <span className="hidden items-center gap-1 text-cyan-300 sm:flex">
                <Crosshair className="h-3.5 w-3.5" />
                {dropHazardMode ? 'Placing hazard zone' : 'Click map to move worker'}
              </span>
            </div>
          </div>

          <div className="tactical-grid relative w-full">
            <svg
              viewBox="0 0 1000 600"
              onClick={handleSvgClick}
              className="h-[430px] w-full cursor-crosshair select-none sm:h-[500px]"
            >
              <defs>
                <radialGradient id="hazardGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.34" />
                  <stop offset="70%" stopColor="#ef4444" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="meshGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Topographic contour lines for authentic crisis-zone cartography */}
              <path
                d="M 0,180 Q 220,120 420,210 T 1000,140"
                fill="none"
                stroke="#1e293b"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
              <path
                d="M 0,390 Q 300,320 560,410 T 1000,360"
                fill="none"
                stroke="#1e293b"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
              {/* River / Canal feature */}
              <path
                d="M 380,600 C 440,480 465,410 500,330 C 535,250 610,180 710,0"
                fill="none"
                stroke="#0c4a6e"
                strokeWidth="14"
                strokeLinecap="round"
                opacity="0.35"
              />
              <path
                d="M 380,600 C 440,480 465,410 500,330 C 535,250 610,180 710,0"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="10 8"
                opacity="0.35"
              />

              {/* Road Corridor Network Edges */}
              {TACTICAL_MAP_EDGES.map((edge) => {
                const a = nodeById.get(edge.from);
                const b = nodeById.get(edge.to);
                if (!a || !b) return null;
                const stroke =
                  edge.roadCondition === 'COMPROMISED'
                    ? '#991b1b'
                    : edge.roadCondition === 'FLOODED'
                      ? '#0369a1'
                      : edge.roadCondition === 'DEBRIS'
                        ? '#92400e'
                        : '#334155';
                return (
                  <g key={`${edge.from}-${edge.to}`}>
                    <line
                      x1={a.coords.x}
                      y1={a.coords.y}
                      x2={b.coords.x}
                      y2={b.coords.y}
                      stroke={stroke}
                      strokeWidth={edge.roadCondition === 'CLEAR' ? 3 : 2.5}
                      strokeDasharray={edge.roadCondition === 'CLEAR' ? undefined : '5 5'}
                      opacity={0.75}
                    />
                    <text
                      x={(a.coords.x + b.coords.x) / 2}
                      y={(a.coords.y + b.coords.y) / 2 - 5}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {edge.distanceKm}km
                    </text>
                  </g>
                );
              })}

              {/* Local Mesh Network Radio Rings */}
              {showMeshRings &&
                peers.map((peer) => (
                  <g key={`mesh-${peer.id}`}>
                    <circle
                      cx={peer.coords.x}
                      cy={peer.coords.y}
                      r={105}
                      fill="url(#meshGrad)"
                      stroke="#06b6d4"
                      strokeOpacity="0.32"
                      strokeWidth="1.2"
                      strokeDasharray="4 4"
                    />
                    <circle
                      cx={peer.coords.x}
                      cy={peer.coords.y}
                      r={5}
                      fill="#22d3ee"
                      stroke="#083344"
                      strokeWidth="2"
                    />
                    <text
                      x={peer.coords.x + 8}
                      y={peer.coords.y + 4}
                      fill="#67e8f9"
                      fontSize="9.5"
                      fontFamily="monospace"
                    >
                      {peer.callsign}
                    </text>
                  </g>
                ))}

              {/* Active Hazard Zones (Whiteboard Red X markers!) */}
              {hazards
                .filter((h) => h.active)
                .map((hz) => (
                  <g key={hz.id}>
                    <circle
                      cx={hz.coords.x}
                      cy={hz.coords.y}
                      r={hz.radius}
                      fill="url(#hazardGrad)"
                      stroke="#ef4444"
                      strokeOpacity="0.55"
                      strokeWidth="1.5"
                      strokeDasharray="6 4"
                    />
                    {/* Red X Marker */}
                    <line
                      x1={hz.coords.x - 10}
                      y1={hz.coords.y - 10}
                      x2={hz.coords.x + 10}
                      y2={hz.coords.y + 10}
                      stroke="#ef4444"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                    <line
                      x1={hz.coords.x + 10}
                      y1={hz.coords.y - 10}
                      x2={hz.coords.x - 10}
                      y2={hz.coords.y + 10}
                      stroke="#ef4444"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                    <rect
                      x={hz.coords.x - 66}
                      y={hz.coords.y + 14}
                      width="132"
                      height="20"
                      rx="5"
                      fill="#450a0a"
                      fillOpacity="0.88"
                      stroke="#ef4444"
                      strokeOpacity="0.6"
                    />
                    <text
                      x={hz.coords.x}
                      y={hz.coords.y + 27}
                      fill="#fecaca"
                      fontSize="9.5"
                      fontWeight="700"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      DANGER {hz.dangerLevel}/10 · {hz.type}
                    </text>
                  </g>
                ))}

              {/* Pure Shortest Route (Dashed Amber/Red to warn against dangerous shortcuts) */}
              {routing.pureShortestRoute &&
                routing.safestOptimalRoute &&
                routing.pureShortestRoute.campId !== routing.safestOptimalRoute.campId && (
                  <polyline
                    points={toPolyline(routing.pureShortestRoute.points)}
                    fill="none"
                    stroke="#f87171"
                    strokeWidth="3"
                    strokeDasharray="7 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.75"
                  />
                )}

              {/* Route to Selected Camp (if different from global optimal) */}
              {routeToSelectedSafe &&
                routeToSelectedSafe.campId !== routing.safestOptimalRoute?.campId && (
                  <polyline
                    points={toPolyline(routeToSelectedSafe.points)}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="3.5"
                    strokeDasharray="10 5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.85"
                  />
                )}

              {/* GLOBAL SAFEST & SHORTEST OPTIMAL PATH (Whiteboard: distance × danger level) */}
              {routing.safestOptimalRoute && (
                <g>
                  <polyline
                    points={toPolyline(routing.safestOptimalRoute.points)}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.2"
                  />
                  <polyline
                    points={toPolyline(routing.safestOptimalRoute.points)}
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              )}

              {/* Road Junction Dots */}
              {TACTICAL_MAP_NODES.filter((n) => !n.campId).map((j) => (
                <circle
                  key={j.id}
                  cx={j.coords.x}
                  cy={j.coords.y}
                  r={3.5}
                  fill="#475569"
                  stroke="#0f172a"
                  strokeWidth="1.5"
                />
              ))}

              {/* Aid Camp Markers */}
              {camps.map((camp) => {
                const palette = statusColors[camp.status];
                const isSelected = camp.id === selectedCamp?.id;
                const isRecommended = camp.id === routing.safestOptimalRoute?.campId;
                return (
                  <g
                    key={camp.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCampId(camp.id);
                    }}
                    className="cursor-pointer"
                  >
                    {/* Recommended glow halo */}
                    {isRecommended && (
                      <circle
                        cx={camp.coords.x}
                        cy={camp.coords.y}
                        r={30}
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                      />
                    )}

                    {/* Selection ring */}
                    {isSelected && (
                      <circle
                        cx={camp.coords.x}
                        cy={camp.coords.y}
                        r={25}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2.5"
                      />
                    )}

                    {/* Camp body */}
                    <rect
                      x={camp.coords.x - 19}
                      y={camp.coords.y - 19}
                      width="38"
                      height="38"
                      rx="10"
                      fill={palette.fill}
                      stroke={palette.ring}
                      strokeWidth="2.5"
                    />

                    {/* Camp icon text: Beds or X if destroyed */}
                    {camp.status === 'DESTROYED' ? (
                      <text
                        x={camp.coords.x}
                        y={camp.coords.y + 6}
                        fill="#fca5a5"
                        fontSize="16"
                        fontWeight="800"
                        textAnchor="middle"
                      >
                        ✕
                      </text>
                    ) : (
                      <>
                        <text
                          x={camp.coords.x}
                          y={camp.coords.y + 1}
                          fill="#ffffff"
                          fontSize="13"
                          fontWeight="800"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {camp.availableBeds}
                        </text>
                        <text
                          x={camp.coords.x}
                          y={camp.coords.y + 12}
                          fill="#cbd5e1"
                          fontSize="7.5"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          BEDS
                        </text>
                      </>
                    )}

                    {/* Camp Label Pill */}
                    <rect
                      x={camp.coords.x - 62}
                      y={camp.coords.y - 44}
                      width="124"
                      height="20"
                      rx="6"
                      fill="#0f172a"
                      fillOpacity="0.92"
                      stroke={isRecommended ? '#10b981' : '#334155'}
                      strokeWidth="1.2"
                    />
                    <text
                      x={camp.coords.x}
                      y={camp.coords.y - 31}
                      fill={camp.status === 'DESTROYED' ? '#fca5a5' : '#f8fafc'}
                      fontSize="10"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {camp.code} · {camp.status === 'DESTROYED' ? 'DESTROYED' : `Safe ${camp.safetyLevel}/10`}
                    </text>
                  </g>
                );
              })}

              {/* Field Worker Current Position Marker */}
              <g>
                <circle
                  cx={workerPos.x}
                  cy={workerPos.y}
                  r={18}
                  fill="#06b6d4"
                  fillOpacity="0.18"
                  stroke="#22d3ee"
                  strokeWidth="1.5"
                />
                <circle
                  cx={workerPos.x}
                  cy={workerPos.y}
                  r={8}
                  fill="#22d3ee"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                />
                <rect
                  x={workerPos.x - 42}
                  y={workerPos.y + 14}
                  width="84"
                  height="18"
                  rx="5"
                  fill="#083344"
                  stroke="#22d3ee"
                  strokeWidth="1"
                />
                <text
                  x={workerPos.x}
                  y={workerPos.y + 26}
                  fill="#cffafe"
                  fontSize="9.5"
                  fontWeight="700"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  YOU (FIELD)
                </text>
              </g>
            </svg>
          </div>

          {/* Bottom Map Legend & Formula Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-900/90 px-4 py-2.5 text-[11px]">
            <div className="flex flex-wrap items-center gap-3 text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-5 rounded-full bg-emerald-400" />
                Safest & Shortest Route
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-5 border-t-2 border-dashed border-red-400" />
                Risky Raw Shortest
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/60 ring-1 ring-red-400" />
                Hazard Zone (✕)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border border-dashed border-cyan-400" />
                Local Mesh Peer
              </span>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-slate-300">
                <span className="font-mono text-[10px] text-cyan-300">
                  Cost = dist × (1 + {dangerWeight.toFixed(2)}×danger)
                </span>
                <input
                  type="range"
                  min={0.1}
                  max={1.2}
                  step={0.05}
                  value={dangerWeight}
                  onChange={(e) => onChangeDangerWeight(parseFloat(e.target.value))}
                  className="w-24 accent-emerald-400"
                />
              </label>
              <label className="flex items-center gap-1.5 text-slate-300">
                <span>Min Beds:</span>
                <select
                  value={minBeds}
                  onChange={(e) => setMinBeds(Number(e.target.value))}
                  className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 font-mono text-xs text-white"
                >
                  <option value={1}>1+</option>
                  <option value={5}>5+</option>
                  <option value={10}>10+</option>
                  <option value={15}>15+</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Optimal Path Comparison + Selected Camp Inspector */}
      <div className="flex flex-col gap-3 xl:col-span-4">
        {/* Safest & Shortest Path Algorithm Result */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/35 to-slate-900/90 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Safest & Shortest Path Engine
              </h2>
            </div>
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
              100% OFFLINE
            </span>
          </div>

          {routing.safestOptimalRoute ? (
            <div className="space-y-2.5">
              <div className="rounded-xl border border-emerald-500/30 bg-slate-950/80 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                      Optimal Target Camp
                    </div>
                    <div className="text-sm font-bold text-white">
                      {routing.safestOptimalRoute.campName}
                    </div>
                  </div>
                  <span className="rounded-lg bg-emerald-500/20 px-2 py-1 font-mono text-xs font-bold text-emerald-300">
                    {routing.safestOptimalRoute.etaMinutes} min
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
                  <div className="rounded-lg bg-slate-900 p-1.5">
                    <div className="text-[10px] text-slate-400">Distance</div>
                    <div className="font-bold text-white">
                      {routing.safestOptimalRoute.totalDistanceKm} km
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-1.5">
                    <div className="text-[10px] text-slate-400">Avg Danger</div>
                    <div className="font-bold text-emerald-300">
                      {routing.safestOptimalRoute.avgDangerLevel}/10
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-1.5">
                    <div className="text-[10px] text-slate-400">Score</div>
                    <div className="font-bold text-cyan-300">
                      {routing.safestOptimalRoute.weightedScore}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contrast with dangerous raw shortest route if different */}
              {routing.pureShortestRoute &&
                routing.pureShortestRoute.campId !== routing.safestOptimalRoute.campId && (
                  <div className="rounded-xl border border-red-500/30 bg-red-950/25 p-2.5 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-red-300">
                      <Flame className="h-3.5 w-3.5" />
                      <span>Avoided Dangerous Shortcut ({routing.pureShortestRoute.campName})</span>
                    </div>
                    <p className="mt-1 text-[11px] text-red-200/80">
                      Shorter by{' '}
                      <strong>
                        {Math.max(
                          0,
                          routing.safestOptimalRoute.totalDistanceKm -
                            routing.pureShortestRoute.totalDistanceKm
                        ).toFixed(1)}{' '}
                        km
                      </strong>
                      , but passes{' '}
                      <strong>
                        {routing.pureShortestRoute.hazardsCrossed.join(', ') || 'compromised road'}
                      </strong>{' '}
                      (max danger {routing.pureShortestRoute.maxDangerLevel}/10).
                    </p>
                  </div>
                )}
            </div>
          ) : (
            <p className="text-xs text-red-300">
              No operational camps match the minimum bed filter. Lower bed filter or check alerts.
            </p>
          )}
        </div>

        {/* Selected Camp Detailed Inspector */}
        {selectedCamp && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-cyan-400">
                    {selectedCamp.code}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                      statusColors[selectedCamp.status].badge
                    }`}
                  >
                    {selectedCamp.status}
                  </span>
                </div>
                <h3 className="mt-1 text-base font-bold text-white">{selectedCamp.name}</h3>
                <p className="text-[11px] text-slate-400">{selectedCamp.sector}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <BedDouble className="h-3 w-3 text-cyan-400" /> Open Beds
                </div>
                <div className="mt-0.5 font-mono text-lg font-extrabold text-white">
                  {selectedCamp.availableBeds}
                  <span className="text-xs font-normal text-slate-500">
                    /{selectedCamp.totalBeds}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Shield className="h-3 w-3 text-emerald-400" /> Safety
                </div>
                <div className="mt-0.5 font-mono text-lg font-extrabold text-emerald-300">
                  {selectedCamp.safetyLevel}
                  <span className="text-xs font-normal text-slate-500">/10</span>
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <ShieldAlert className="h-3 w-3 text-amber-400" /> Uncertainty
                </div>
                <div
                  className={`mt-0.5 font-mono text-lg font-extrabold ${
                    selectedCamp.uncertaintyScore >= 50
                      ? 'text-red-400'
                      : selectedCamp.uncertaintyScore >= 25
                        ? 'text-amber-300'
                        : 'text-emerald-300'
                  }`}
                >
                  {selectedCamp.uncertaintyScore}%
                </div>
              </div>
            </div>

            {/* Supplies & Uncertainty note */}
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex flex-wrap gap-1.5">
                {selectedCamp.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="rounded-md border border-slate-700/80 bg-slate-800/70 px-2 py-0.5 text-[10px] text-slate-300"
                  >
                    {cap}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-950/60 p-2 font-mono text-[10px] text-slate-300">
                <div>Water: {selectedCamp.supplies.waterLiters}L</div>
                <div>Trauma: {selectedCamp.supplies.traumaKits} kits</div>
                <div>Power: {selectedCamp.supplies.powerHoursLeft}h</div>
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-[11px] text-amber-200/90">
                <strong className="text-amber-300">Uncertainty Log:</strong>{' '}
                {selectedCamp.uncertaintyNotes}
                <div className="mt-1 font-mono text-[10px] text-slate-400">
                  Updated by {selectedCamp.lastUpdatedBy} (v{selectedCamp.version})
                </div>
              </div>

              {/* Direct route info to this selected camp */}
              {routeToSelectedSafe && routeToSelectedShort && (
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5 text-[11px] text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 font-semibold text-cyan-300">
                      <Navigation className="h-3.5 w-3.5" /> Safe Route to {selectedCamp.code}
                    </span>
                    <span className="font-mono">
                      {routeToSelectedSafe.totalDistanceKm} km · {routeToSelectedSafe.etaMinutes}m
                    </span>
                  </div>
                  {routeToSelectedSafe.hazardsCrossed.length > 0 && (
                    <div className="mt-1 text-[10px] text-amber-300">
                      ⚠ Caution near: {routeToSelectedSafe.hazardsCrossed.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-3 flex flex-col gap-2">
              <button
                onClick={() => onOpenReportForCamp(selectedCamp.id)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/25"
              >
                <Radio className="h-3.5 w-3.5" />
                <span>Submit Field Update for {selectedCamp.code}</span>
              </button>

              {selectedCamp.status !== 'DESTROYED' && !selectedCamp.isMainBase && (
                <button
                  onClick={() => onMarkCampDestroyed(selectedCamp.id)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/15 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/25"
                >
                  <AlertOctagon className="h-3.5 w-3.5" />
                  <span>Report Camp Destroyed · Broadcast Alert</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Compact All-Camps Quick Selector */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            All Sector Aid Camps ({camps.filter((c) => c.status !== 'DESTROYED').length}/{camps.length}{' '}
            Active)
          </div>
          <div className="space-y-1.5">
            {camps.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCampId(c.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-2.5 py-2 text-left text-xs transition ${
                  c.id === selectedCamp?.id
                    ? 'border-cyan-500/50 bg-cyan-500/10'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-semibold text-slate-100">{c.name}</div>
                  <div className="font-mono text-[10px] text-slate-400">
                    {c.code} · Safe {c.safetyLevel}/10 · Unc {c.uncertaintyScore}%
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-mono text-xs font-bold ${
                      c.status === 'DESTROYED'
                        ? 'text-red-400'
                        : c.availableBeds <= 5
                          ? 'text-amber-300'
                          : 'text-emerald-300'
                    }`}
                  >
                    {c.status === 'DESTROYED' ? 'DESTROYED' : `${c.availableBeds} beds`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
