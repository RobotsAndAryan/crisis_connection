import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertOctagonIcon,
  CrosshairIcon,
  FlameIcon,
  NavigationIcon,
  RadioIcon,
  SearchIcon,
  WifiOffIcon,
  XIcon,
} from './icons';
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
import { UncertaintyMeter } from './UncertaintyMeter';
import { FormattedText } from './FormattedText';

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

const statusMeta: Record<
  AidCamp['status'],
  { stroke: string; fill: string; dot: string; label: string; textTone: string }
> = {
  ACTIVE: {
    stroke: '#4cc38a',
    fill: '#14241c',
    dot: 'bg-safe',
    label: 'Active',
    textTone: 'text-safe',
  },
  OVERCROWDED: {
    stroke: '#e2a43b',
    fill: '#261e12',
    dot: 'bg-caution',
    label: 'Overcrowded',
    textTone: 'text-caution',
  },
  DAMAGED: {
    stroke: '#e2a43b',
    fill: '#291c12',
    dot: 'bg-caution',
    label: 'Damaged',
    textTone: 'text-caution',
  },
  DESTROYED: {
    stroke: '#e5484d',
    fill: '#2b1416',
    dot: 'bg-hazard',
    label: 'Destroyed',
    textTone: 'text-hazard',
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
  const [confirmDestroyId, setConfirmDestroyId] = useState<string | null>(null);
  const [mapQuery, setMapQuery] = useState<string>('');
  const [mapAnswer, setMapAnswer] = useState<{
    text: string;
    inferenceSource: InferenceSourceLabel;
    latencyMs: number;
  } | null>(null);
  const [askingMap, setAskingMap] = useState<boolean>(false);

  // Escape exits armed drop-hazard or destroy confirmation state
  useEffect(() => {
    if (!dropHazardMode && !confirmDestroyId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropHazardMode(false);
        setConfirmDestroyId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dropHazardMode, confirmDestroyId]);

  const routing = useMemo(
    () => findBestCampRoutes(workerPos, camps, hazards, dangerWeight, minBeds),
    [workerPos, camps, hazards, dangerWeight, minBeds]
  );

  const selectedCamp = camps.find((c) => c.id === selectedCampId) ?? camps[0];

  // Clear pending destroy confirmation whenever selected camp changes
  useEffect(() => {
    setConfirmDestroyId(null);
  }, [selectedCamp?.id]);

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
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 580);
    const clamped = {
      x: Math.max(44, Math.min(956, x)),
      y: Math.max(40, Math.min(540, y)),
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

  const getCampLabelOffset = (camp: AidCamp) => {
    if (camp.id === 'camp-south' || camp.coords.y > 460) {
      return { yOffset: 30, textY: 43 };
    }
    return { yOffset: -46, textY: -33 };
  };

  const getHazardLabelOffset = (hz: HazardZone) => {
    if (hz.id === 'haz-3') {
      return { dx: 34, dy: -36 };
    }
    if (hz.id === 'haz-2') {
      return { dx: -24, dy: 20 };
    }
    return { dx: 0, dy: 20 };
  };

  const workerTagBelow = workerPos.y < 76;

  // Compute real 6-hour bed depletion delta & latest onset event from camp.history
  const bedHistoryStats = useMemo(() => {
    if (!selectedCamp || selectedCamp.history.length < 2) return null;
    const pts = selectedCamp.history.slice(-4);
    const first = pts[0];
    const latest = pts[pts.length - 1];
    const delta = latest.availableBeds - first.availableBeds;
    return { pts, delta, latestNote: latest.note };
  }, [selectedCamp]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      {/* Left 8 Columns: Sector Meridian Topographic Dispatch Map */}
      <div className="flex flex-col gap-4 xl:col-span-8">
        <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
          {/* Map Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-ink-primary">Sector Meridian</h2>
              <span className="font-mono text-[11px] text-ink-muted">34.07°N 118.24°W</span>
              {operatingMode === 'FIELD_OFFLINE' && (
                <span className="inline-flex items-center gap-1 rounded border border-caution/30 bg-caution-dim/60 px-1.5 py-0.5 text-[11px] font-medium text-caution">
                  <WifiOffIcon size={12} />
                  Cached offline
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-ink-secondary">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={showMeshRings}
                  onChange={(e) => setShowMeshRings(e.target.checked)}
                  className="instrument-check"
                />
                <span>Mesh range</span>
              </label>

              <button
                onClick={() => setDropHazardMode((v) => !v)}
                aria-pressed={dropHazardMode}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors duration-150 ease-instrument sm:h-7 ${
                  dropHazardMode
                    ? 'border-hazard bg-hazard-dim text-ink-primary'
                    : 'border-control bg-raised text-ink-secondary hover:bg-raised-hover hover:text-ink-primary'
                }`}
              >
                <FlameIcon size={13} className={dropHazardMode ? 'text-hazard' : 'text-ink-muted'} />
                <span>{dropHazardMode ? 'Click map to place (Esc)' : 'Drop hazard'}</span>
              </button>

              <span className="hidden items-center gap-1.5 text-ink-muted sm:inline-flex">
                <CrosshairIcon size={13} />
                <span>{dropHazardMode ? 'Placing hazard' : 'Click map to move unit'}</span>
              </span>
            </div>
          </div>

          {/* Docked Local Map AI Query Bar */}
          <div className="border-b border-hairline bg-recessed/70 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[240px] flex-1">
                <SearchIcon
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                />
                <input
                  type="text"
                  aria-label="Query local map AI"
                  value={mapQuery}
                  onChange={(e) => setMapQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickMapAsk(mapQuery)}
                  placeholder="Query local map AI for nearest safe camp, beds, or hazards"
                  className="h-10 w-full rounded-lg border border-control bg-surface pl-9 pr-3 text-base text-ink-primary placeholder:text-ink-muted sm:h-9 sm:text-xs"
                />
              </div>
              <button
                onClick={() =>
                  handleQuickMapAsk(
                    mapQuery || 'Tell me where the closest safe aid camp is with available beds'
                  )
                }
                disabled={askingMap}
                className="btn-primary h-10 rounded-lg px-4 text-xs font-medium disabled:opacity-60 sm:h-9"
              >
                {askingMap ? 'Routing...' : 'Ask map AI'}
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="text-ink-muted">Prompts:</span>
              {[
                { label: 'Closest safe camp', query: 'Tell me where the closest safe aid camp is' },
                {
                  label: 'Most trauma kits and water',
                  query: 'Which camp has the most trauma kits and clean water?',
                },
                {
                  label: 'Why avoid Harbor Bridge direct route',
                  query: 'Why should I avoid the direct route to Harbor Bridge?',
                },
              ].map((sample) => (
                <button
                  key={sample.label}
                  onClick={() => handleQuickMapAsk(sample.query)}
                  className="text-ink-secondary underline decoration-ink-muted/40 underline-offset-4 transition-colors duration-150 hover:text-ink-primary hover:decoration-ink-secondary"
                >
                  {sample.label}
                </button>
              ))}
            </div>

            {mapAnswer && (
              <div className="mt-3 rounded-lg border border-hairline bg-surface p-3.5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-ink-primary">
                    Local map AI recommendation
                  </span>
                  <div className="flex items-center gap-2">
                    <InferenceBadge
                      source={mapAnswer.inferenceSource}
                      latencyMs={mapAnswer.latencyMs}
                      compact
                    />
                    <button
                      onClick={() => setMapAnswer(null)}
                      aria-label="Dismiss map recommendation"
                      className="rounded p-1 text-ink-muted transition-colors duration-150 hover:bg-raised hover:text-ink-primary"
                    >
                      <XIcon size={13} />
                    </button>
                  </div>
                </div>
                <FormattedText text={mapAnswer.text} className="text-xs" />
              </div>
            )}
          </div>

          {/* Topographic SVG Dispatch Map Canvas */}
          <div className="relative w-full bg-[#0e100f]">
            <svg
              viewBox="0 0 1000 580"
              onClick={handleSvgClick}
              role="img"
              aria-label="Sector Meridian interactive tactical map"
              className="aspect-[1000/580] w-full cursor-crosshair select-none lg:aspect-auto lg:h-[540px]"
            >
              <defs>
                <pattern
                  id="hazardHatch"
                  width="8"
                  height="8"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="8"
                    stroke="#e5484d"
                    strokeOpacity="0.28"
                    strokeWidth="1.5"
                  />
                </pattern>
                <pattern id="utmGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="#ededeb"
                    strokeOpacity="0.035"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>

              <rect x="28" y="22" width="944" height="536" fill="url(#utmGrid)" />
              <rect
                x="28"
                y="22"
                width="944"
                height="536"
                fill="none"
                stroke="#ededeb"
                strokeOpacity="0.1"
                strokeWidth="1"
              />

              {/* UTM Latitude / Longitude Margin Ticks */}
              {[
                { x: 140, label: '118.28°W' },
                { x: 380, label: '118.25°W' },
                { x: 620, label: '118.22°W' },
                { x: 860, label: '118.19°W' },
              ].map((tick) => (
                <g key={tick.label}>
                  <line
                    x1={tick.x}
                    y1="22"
                    x2={tick.x}
                    y2="28"
                    stroke="#ededeb"
                    strokeOpacity="0.22"
                  />
                  <text
                    x={tick.x}
                    y="15"
                    fill="#686b67"
                    fontSize="9.5"
                    fontFamily="'IBM Plex Mono', monospace"
                    textAnchor="middle"
                  >
                    {tick.label}
                  </text>
                </g>
              ))}
              {[
                { y: 110, label: '34.10°N' },
                { y: 290, label: '34.07°N' },
                { y: 470, label: '34.04°N' },
              ].map((tick) => (
                <g key={tick.label}>
                  <line
                    x1="28"
                    y1={tick.y}
                    x2="34"
                    y2={tick.y}
                    stroke="#ededeb"
                    strokeOpacity="0.22"
                  />
                  <text
                    x="22"
                    y={tick.y + 3}
                    fill="#686b67"
                    fontSize="9"
                    fontFamily="'IBM Plex Mono', monospace"
                    textAnchor="end"
                    transform={`rotate(-90 22 ${tick.y})`}
                  >
                    {tick.label}
                  </text>
                </g>
              ))}

              {/* Topographic Elevation Contours */}
              <g fill="none" stroke="#262926" strokeWidth="1">
                <path d="M 28,175 Q 190,115 360,185 T 730,115 T 972,155" />
                <path d="M 28,220 Q 210,165 390,235 T 755,165 T 972,205" strokeOpacity="0.7" />
                <path d="M 28,395 Q 250,340 480,410 T 972,360" />
                <path d="M 90,470 Q 230,395 360,480 T 520,558" strokeOpacity="0.75" />
                <ellipse cx="155" cy="120" rx="110" ry="62" strokeOpacity="0.45" />
                <ellipse cx="255" cy="455" rx="115" ry="68" strokeOpacity="0.45" />
              </g>
              <text
                x="155"
                y="68"
                fill="#4a4e4a"
                fontSize="8.5"
                fontFamily="'IBM Plex Mono', monospace"
                textAnchor="middle"
              >
                ELEV 420M
              </text>
              <text
                x="175"
                y="518"
                fill="#4a4e4a"
                fontSize="8.5"
                fontFamily="'IBM Plex Mono', monospace"
              >
                HIGHLAND RIDGE 380M
              </text>

              {/* Canal Hydrography */}
              <path
                d="M 380,558 C 440,455 465,395 500,320 C 535,245 605,170 695,22"
                fill="none"
                stroke="#182e3b"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <path
                d="M 380,558 C 440,455 465,395 500,320 C 535,245 605,170 695,22"
                fill="none"
                stroke="#2c5770"
                strokeWidth="1"
                strokeDasharray="8 6"
              />

              {/* Road Corridors */}
              {TACTICAL_MAP_EDGES.map((edge) => {
                const a = nodeById.get(edge.from);
                const b = nodeById.get(edge.to);
                if (!a || !b) return null;
                const stroke =
                  edge.roadCondition === 'COMPROMISED'
                    ? '#843438'
                    : edge.roadCondition === 'FLOODED'
                      ? '#2e5d78'
                      : edge.roadCondition === 'DEBRIS'
                        ? '#806433'
                        : '#3d413d';
                const midX = (a.coords.x + b.coords.x) / 2;
                const midY = (a.coords.y + b.coords.y) / 2;
                const dx = b.coords.x - a.coords.x;
                const dy = b.coords.y - a.coords.y;
                const len = Math.hypot(dx, dy) || 1;
                const offX = (-dy / len) * 11;
                const offY = (dx / len) * 11;
                return (
                  <g key={`${edge.from}-${edge.to}`}>
                    <line
                      x1={a.coords.x}
                      y1={a.coords.y}
                      x2={b.coords.x}
                      y2={b.coords.y}
                      stroke={stroke}
                      strokeWidth={edge.roadCondition === 'CLEAR' ? 2.25 : 2}
                      strokeDasharray={edge.roadCondition === 'CLEAR' ? undefined : '5 4'}
                    />
                    <rect
                      x={midX + offX - 18}
                      y={midY + offY - 7}
                      width="36"
                      height="13"
                      rx="2"
                      fill="#0e100f"
                      fillOpacity="0.88"
                    />
                    <text
                      x={midX + offX}
                      y={midY + offY + 2.5}
                      fill="#7b7f7a"
                      fontSize="9"
                      fontFamily="'IBM Plex Mono', monospace"
                      textAnchor="middle"
                    >
                      {edge.distanceKm}km
                    </text>
                  </g>
                );
              })}

              {/* Local Mesh Peer Range Rings */}
              {showMeshRings &&
                peers.map((peer) => (
                  <g key={`mesh-${peer.id}`}>
                    <circle
                      cx={peer.coords.x}
                      cy={peer.coords.y}
                      r={98}
                      fill="none"
                      stroke="#4ea1f3"
                      strokeOpacity="0.22"
                      strokeWidth="1"
                      strokeDasharray="3 4"
                    />
                    <circle
                      cx={peer.coords.x}
                      cy={peer.coords.y}
                      r={3.5}
                      fill="#4ea1f3"
                      stroke="#0e100f"
                      strokeWidth="1.5"
                    />
                    <text
                      x={peer.coords.x + 8}
                      y={peer.coords.y + 3}
                      fill="#8cbef2"
                      fontSize="9.5"
                      fontFamily="'IBM Plex Mono', monospace"
                    >
                      {peer.callsign}
                    </text>
                  </g>
                ))}

              {/* Active Hatched Hazard Exclusion Zones */}
              {hazards
                .filter((h) => h.active)
                .map((hz) => {
                  const lbl = getHazardLabelOffset(hz);
                  const lx = Math.max(104, Math.min(896, hz.coords.x + lbl.dx));
                  const ly = Math.max(46, Math.min(540, hz.coords.y + lbl.dy));
                  return (
                    <g key={hz.id}>
                      <circle
                        cx={hz.coords.x}
                        cy={hz.coords.y}
                        r={hz.radius}
                        fill="url(#hazardHatch)"
                        stroke="#e5484d"
                        strokeOpacity="0.65"
                        strokeWidth="1.25"
                        strokeDasharray="5 3"
                      />
                      <line
                        x1={hz.coords.x - 8}
                        y1={hz.coords.y - 8}
                        x2={hz.coords.x + 8}
                        y2={hz.coords.y + 8}
                        stroke="#e5484d"
                        strokeWidth="2.5"
                        strokeLinecap="square"
                      />
                      <line
                        x1={hz.coords.x + 8}
                        y1={hz.coords.y - 8}
                        x2={hz.coords.x - 8}
                        y2={hz.coords.y + 8}
                        stroke="#e5484d"
                        strokeWidth="2.5"
                        strokeLinecap="square"
                      />
                      <rect
                        x={lx - 68}
                        y={ly - 10}
                        width="136"
                        height="19"
                        rx="4"
                        fill="#1f1213"
                        fillOpacity="0.94"
                        stroke="#e5484d"
                        strokeOpacity="0.45"
                        strokeWidth="1"
                      />
                      <text
                        x={lx}
                        y={ly + 3}
                        fill="#f3b2b4"
                        fontSize="9.5"
                        fontWeight="500"
                        fontFamily="'IBM Plex Mono', monospace"
                        textAnchor="middle"
                      >
                        D{hz.dangerLevel}/10 · {hz.type}
                      </text>
                    </g>
                  );
                })}

              {/* Risky Raw Shortest Route */}
              {routing.pureShortestRoute &&
                routing.safestOptimalRoute &&
                routing.pureShortestRoute.campId !== routing.safestOptimalRoute.campId && (
                  <polyline
                    points={toPolyline(routing.pureShortestRoute.points)}
                    fill="none"
                    stroke="#e5484d"
                    strokeWidth="2.25"
                    strokeDasharray="6 5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.85"
                  />
                )}

              {/* Route to Selected Camp */}
              {routeToSelectedSafe &&
                routeToSelectedSafe.campId !== routing.safestOptimalRoute?.campId && (
                  <polyline
                    points={toPolyline(routeToSelectedSafe.points)}
                    fill="none"
                    stroke="#4ea1f3"
                    strokeWidth="2.5"
                    strokeDasharray="8 5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.9"
                  />
                )}

              {/* Safest Optimal Route */}
              {routing.safestOptimalRoute && (
                <g>
                  <polyline
                    points={toPolyline(routing.safestOptimalRoute.points)}
                    fill="none"
                    stroke="#4cc38a"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {routing.safestOptimalRoute.points.slice(1, -1).map((pt, idx) => (
                    <circle
                      key={`wp-${idx}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={3.5}
                      fill="#0e100f"
                      stroke="#4cc38a"
                      strokeWidth="2"
                    />
                  ))}
                </g>
              )}

              {/* Junction Dots */}
              {TACTICAL_MAP_NODES.filter((n) => !n.campId).map((j) => (
                <circle
                  key={j.id}
                  cx={j.coords.x}
                  cy={j.coords.y}
                  r={3}
                  fill="#4c504c"
                  stroke="#0e100f"
                  strokeWidth="1.5"
                />
              ))}

              {/* Keyboard-Accessible Aid Camp Stations */}
              {camps.map((camp) => {
                const meta = statusMeta[camp.status];
                const isSelected = camp.id === selectedCamp?.id;
                const isRecommended = camp.id === routing.safestOptimalRoute?.campId;
                const lbl = getCampLabelOffset(camp);

                return (
                  <g
                    key={camp.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${camp.name} (${camp.code}), ${camp.status === 'DESTROYED' ? 'Destroyed' : `${camp.availableBeds} open beds, safety ${camp.safetyLevel} out of 10`}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCampId(camp.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedCampId(camp.id);
                      }
                    }}
                    className="cursor-pointer focus:outline-none"
                  >
                    {isRecommended && (
                      <g stroke="#4cc38a" strokeWidth="1.75" fill="none">
                        <path d={`M ${camp.coords.x - 24},${camp.coords.y - 16} V ${camp.coords.y - 24} H ${camp.coords.x - 16}`} />
                        <path d={`M ${camp.coords.x + 16},${camp.coords.y - 24} H ${camp.coords.x + 24} V ${camp.coords.y - 16}`} />
                        <path d={`M ${camp.coords.x - 24},${camp.coords.y + 16} V ${camp.coords.y + 24} H ${camp.coords.x - 16}`} />
                        <path d={`M ${camp.coords.x + 16},${camp.coords.y + 24} H ${camp.coords.x + 24} V ${camp.coords.y + 16}`} />
                      </g>
                    )}

                    {isSelected && (
                      <rect
                        x={camp.coords.x - 22}
                        y={camp.coords.y - 22}
                        width="44"
                        height="44"
                        rx="8"
                        fill="none"
                        stroke="#4ea1f3"
                        strokeWidth="1.75"
                      />
                    )}

                    <rect
                      x={camp.coords.x - 17}
                      y={camp.coords.y - 17}
                      width="34"
                      height="34"
                      rx="6"
                      fill={meta.fill}
                      stroke={meta.stroke}
                      strokeWidth="1.75"
                    />

                    {camp.status === 'DESTROYED' ? (
                      <text
                        x={camp.coords.x}
                        y={camp.coords.y + 5}
                        fill="#f3a6a8"
                        fontSize="15"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        ×
                      </text>
                    ) : (
                      <>
                        <text
                          x={camp.coords.x}
                          y={camp.coords.y + 1}
                          fill="#ededeb"
                          fontSize="12.5"
                          fontWeight="600"
                          fontFamily="'IBM Plex Mono', monospace"
                          textAnchor="middle"
                        >
                          {camp.availableBeds}
                        </text>
                        <text
                          x={camp.coords.x}
                          y={camp.coords.y + 11}
                          fill="#9fa39e"
                          fontSize="7.5"
                          fontFamily="'IBM Plex Mono', monospace"
                          textAnchor="middle"
                        >
                          BEDS
                        </text>
                      </>
                    )}

                    <rect
                      x={camp.coords.x - 56}
                      y={camp.coords.y + lbl.yOffset}
                      width="112"
                      height="19"
                      rx="4"
                      fill="#141514"
                      fillOpacity="0.95"
                      stroke={isRecommended ? '#4cc38a' : isSelected ? '#4ea1f3' : '#323532'}
                      strokeWidth="1"
                    />
                    <text
                      x={camp.coords.x}
                      y={camp.coords.y + lbl.textY}
                      fill={camp.status === 'DESTROYED' ? '#f3a6a8' : '#ededeb'}
                      fontSize="9.5"
                      fontWeight="500"
                      fontFamily="'IBM Plex Mono', monospace"
                      textAnchor="middle"
                    >
                      {camp.code} · {camp.status === 'DESTROYED' ? 'OUT' : `${camp.safetyLevel}/10`}
                    </text>
                  </g>
                );
              })}

              {/* Field Worker Unit Reticle */}
              <g>
                <circle
                  cx={workerPos.x}
                  cy={workerPos.y}
                  r={14}
                  fill="#4ea1f3"
                  fillOpacity="0.12"
                  stroke="#4ea1f3"
                  strokeWidth="1.25"
                />
                <circle
                  cx={workerPos.x}
                  cy={workerPos.y}
                  r={5.5}
                  fill="#4ea1f3"
                  stroke="#ededeb"
                  strokeWidth="2"
                />
                <rect
                  x={workerPos.x - 36}
                  y={workerTagBelow ? workerPos.y + 16 : workerPos.y - 36}
                  width="72"
                  height="18"
                  rx="4"
                  fill="#121e2b"
                  stroke="#4ea1f3"
                  strokeOpacity="0.7"
                  strokeWidth="1"
                />
                <text
                  x={workerPos.x}
                  y={workerTagBelow ? workerPos.y + 28 : workerPos.y - 24}
                  fill="#dcebfa"
                  fontSize="9.5"
                  fontWeight="500"
                  fontFamily="'IBM Plex Mono', monospace"
                  textAnchor="middle"
                >
                  UNIT POS
                </text>
              </g>
            </svg>
          </div>

          {/* Map Legend & Routing Formula Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-hairline bg-surface px-4 py-3 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-ink-secondary">
              <span className="flex items-center gap-2">
                <span className="h-[3px] w-4 rounded-full bg-safe" />
                Safest route
              </span>
              <span className="flex items-center gap-2">
                <span className="h-0 w-4 border-t-2 border-dashed border-hazard" />
                Risky shortcut
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-[2px] border border-hazard bg-hazard/20" />
                Hazard zone
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full border border-dashed border-accent" />
                Mesh peer
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2.5 text-ink-secondary">
                <span className="tabular font-mono text-[11px] text-ink-muted">
                  dist × (1 + {dangerWeight.toFixed(2)}×danger)
                </span>
                <input
                  type="range"
                  min={0.1}
                  max={1.2}
                  step={0.05}
                  value={dangerWeight}
                  onChange={(e) => onChangeDangerWeight(parseFloat(e.target.value))}
                  aria-label="Danger weight"
                  className="w-24"
                />
              </label>

              <label className="flex items-center gap-2 text-ink-secondary">
                <span>Min beds</span>
                <select
                  value={minBeds}
                  onChange={(e) => setMinBeds(Number(e.target.value))}
                  className="h-8 rounded-md border border-control bg-recessed px-2 font-mono text-xs text-ink-primary sm:h-7"
                >
                  <option value={1}>1+</option>
                  <option value={5}>5+</option>
                  <option value={10}>10+</option>
                  <option value={15}>15+</option>
                </select>
              </label>
            </div>
          </div>
        </section>
      </div>

      {/* Right 4 Columns: Optimal Route Summary, Selected Camp Inspector, Sector Camp Table */}
      <div className="flex flex-col gap-4 xl:col-span-4">
        {/* Optimal Route Summary */}
        <section className="rounded-xl border border-hairline bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-medium text-ink-secondary">Optimal evacuation route</h2>
            <span className="font-mono text-[11px] text-ink-muted">Offline Dijkstra</span>
          </div>

          {routing.safestOptimalRoute ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-base font-semibold text-ink-primary">
                  {routing.safestOptimalRoute.campName}
                </div>
                <span className="tabular font-mono text-sm font-medium text-safe">
                  {routing.safestOptimalRoute.etaMinutes} min
                </span>
              </div>

              <div className="grid grid-cols-3 divide-x divide-hairline rounded-lg border border-hairline bg-recessed">
                <div className="px-3 py-2">
                  <div className="text-[11px] text-ink-muted">Distance</div>
                  <div className="tabular mt-0.5 font-mono text-sm font-medium text-ink-primary">
                    {routing.safestOptimalRoute.totalDistanceKm} km
                  </div>
                </div>
                <div className="px-3 py-2">
                  <div className="text-[11px] text-ink-muted">Avg danger</div>
                  <div className="tabular mt-0.5 font-mono text-sm font-medium text-safe">
                    {routing.safestOptimalRoute.avgDangerLevel}/10
                  </div>
                </div>
                <div className="px-3 py-2">
                  <div className="text-[11px] text-ink-muted">Cost score</div>
                  <div className="tabular mt-0.5 font-mono text-sm font-medium text-ink-primary">
                    {routing.safestOptimalRoute.weightedScore}
                  </div>
                </div>
              </div>

              {routing.pureShortestRoute &&
                routing.pureShortestRoute.campId !== routing.safestOptimalRoute.campId && (
                  <div className="rounded-lg border border-hazard/30 bg-hazard-dim/60 p-3 text-xs">
                    <div className="font-medium text-ink-primary">
                      Avoided shortcut to {routing.pureShortestRoute.campName}
                    </div>
                    <p className="mt-1 leading-relaxed text-ink-secondary">
                      Shorter by{' '}
                      <span className="tabular font-mono text-ink-primary">
                        {Math.max(
                          0,
                          routing.safestOptimalRoute.totalDistanceKm -
                            routing.pureShortestRoute.totalDistanceKm
                        ).toFixed(1)}{' '}
                        km
                      </span>
                      , but crosses{' '}
                      {routing.pureShortestRoute.hazardsCrossed.join(', ') || 'compromised road'}{' '}
                      (danger{' '}
                      <span className="tabular font-mono text-hazard">
                        {routing.pureShortestRoute.maxDangerLevel}/10
                      </span>
                      ).
                    </p>
                  </div>
                )}
            </div>
          ) : (
            <p className="mt-2 text-xs text-hazard">
              No operational camps match the minimum bed filter. Lower the threshold or check alerts.
            </p>
          )}
        </section>

        {/* Selected Camp Inspector */}
        {selectedCamp && (
          <section className="rounded-xl border border-hairline bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-medium text-ink-secondary">
                    {selectedCamp.code}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-ink-secondary">
                    <span className={`h-1.5 w-1.5 rounded-full ${statusMeta[selectedCamp.status].dot}`} />
                    <span className={statusMeta[selectedCamp.status].textTone}>
                      {statusMeta[selectedCamp.status].label}
                    </span>
                  </span>
                </div>
                <h3 className="mt-1 truncate text-base font-semibold text-ink-primary">
                  {selectedCamp.name}
                </h3>
                <p className="text-xs text-ink-muted">{selectedCamp.sector}</p>
              </div>
              <span className="tabular shrink-0 font-mono text-[11px] text-ink-muted">
                v{selectedCamp.version}
              </span>
            </div>

            {/* 1px-Divided Camp KPI Strip */}
            <div className="mt-3 grid grid-cols-3 divide-x divide-hairline rounded-lg border border-hairline bg-recessed">
              <div className="px-3 py-2.5">
                <div className="text-[11px] text-ink-muted">Open beds</div>
                <div className="tabular mt-1 font-mono text-base font-medium text-ink-primary">
                  {selectedCamp.availableBeds}
                  <span className="text-xs text-ink-muted">/{selectedCamp.totalBeds}</span>
                </div>
              </div>
              <div className="px-3 py-2.5">
                <div className="text-[11px] text-ink-muted">Safety</div>
                <div className="tabular mt-1 font-mono text-base font-medium text-ink-primary">
                  {selectedCamp.safetyLevel}
                  <span className="text-xs text-ink-muted">/10</span>
                </div>
              </div>
              <div className="px-3 py-2.5">
                <div className="text-[11px] text-ink-muted">Uncertainty</div>
                <div className="mt-1.5">
                  <UncertaintyMeter value={selectedCamp.uncertaintyScore} compact />
                </div>
              </div>
            </div>

            {/* Real 6-Hour Bed Trend & Onset (Operate mode history) */}
            {bedHistoryStats && (
              <div className="mt-3 rounded-lg border border-hairline bg-recessed px-3 py-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-ink-muted">6h bed availability trend</span>
                  <span
                    className={`tabular font-mono text-[11px] font-medium ${
                      bedHistoryStats.delta < 0
                        ? 'text-caution'
                        : bedHistoryStats.delta > 0
                          ? 'text-safe'
                          : 'text-ink-muted'
                    }`}
                  >
                    {bedHistoryStats.delta > 0 ? `+${bedHistoryStats.delta}` : bedHistoryStats.delta}{' '}
                    beds vs 6h ago
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {bedHistoryStats.pts.map((pt, i) => {
                    const pct = Math.max(
                      6,
                      Math.round((pt.availableBeds / Math.max(1, selectedCamp.totalBeds)) * 100)
                    );
                    const isLatest = i === bedHistoryStats.pts.length - 1;
                    return (
                      <div key={pt.timestamp + i} className="space-y-1">
                        <div className="h-1.5 w-full overflow-hidden rounded-[2px] bg-ink-primary/10">
                          <div
                            className={`h-full rounded-[2px] ${
                              isLatest
                                ? selectedCamp.status === 'DESTROYED'
                                  ? 'bg-hazard'
                                  : selectedCamp.availableBeds <= 6
                                    ? 'bg-caution'
                                    : 'bg-safe'
                                : 'bg-ink-secondary/45'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="tabular font-mono text-[10px] text-ink-muted">
                          {pt.availableBeds}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-1.5 text-[11px] text-ink-secondary">
                  Latest change: {bedHistoryStats.latestNote}
                </div>
              </div>
            )}

            {/* Capabilities + Supplies + Uncertainty Note */}
            <div className="mt-3 space-y-3 text-xs">
              <div className="flex flex-wrap gap-1.5">
                {selectedCamp.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="rounded border border-hairline bg-recessed px-2 py-0.5 text-[11px] text-ink-secondary"
                  >
                    {cap}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-lg border border-hairline bg-recessed px-3 py-2 font-mono text-[11px] text-ink-secondary">
                <div className="tabular">Water {selectedCamp.supplies.waterLiters} L</div>
                <div className="tabular">Trauma {selectedCamp.supplies.traumaKits}</div>
                <div className="tabular">Power {selectedCamp.supplies.powerHoursLeft} h</div>
              </div>

              <div className="rounded-lg border border-hairline bg-recessed p-3">
                <div className="text-[11px] font-medium text-ink-primary">Uncertainty log</div>
                <p className="mt-1 leading-relaxed text-ink-secondary">
                  {selectedCamp.uncertaintyNotes}
                </p>
                <div className="mt-1.5 font-mono text-[11px] text-ink-muted">
                  {selectedCamp.lastUpdatedBy}
                </div>
              </div>

              {routeToSelectedSafe && routeToSelectedShort && (
                <div className="flex items-center justify-between rounded-lg border border-hairline bg-recessed px-3 py-2">
                  <span className="flex items-center gap-1.5 text-ink-secondary">
                    <NavigationIcon size={14} className="text-ink-muted" />
                    <span>Safe route to {selectedCamp.code}</span>
                  </span>
                  <span className="tabular font-mono text-xs text-ink-primary">
                    {routeToSelectedSafe.totalDistanceKm} km · {routeToSelectedSafe.etaMinutes} min
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons with Two-Step Confirmation on Destructive Action */}
            <div className="mt-4 grid grid-cols-1 gap-2">
              <button
                onClick={() => onOpenReportForCamp(selectedCamp.id)}
                className="btn-secondary flex h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-medium sm:h-9"
              >
                <RadioIcon size={14} className="text-ink-muted" />
                <span>Log field update for {selectedCamp.code}</span>
              </button>

              {selectedCamp.status !== 'DESTROYED' && !selectedCamp.isMainBase && (
                confirmDestroyId === selectedCamp.id ? (
                  <div className="flex items-center gap-2 rounded-lg border border-hazard/45 bg-hazard-dim/70 p-2">
                    <button
                      onClick={() => {
                        onMarkCampDestroyed(selectedCamp.id);
                        setConfirmDestroyId(null);
                      }}
                      className="btn-danger flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-medium sm:h-8"
                    >
                      <AlertOctagonIcon size={14} />
                      <span>Confirm destroy {selectedCamp.code}</span>
                    </button>
                    <button
                      onClick={() => setConfirmDestroyId(null)}
                      className="btn-secondary h-9 rounded-md px-3 text-xs font-medium sm:h-8"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDestroyId(selectedCamp.id)}
                    className="btn-danger flex h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-medium sm:h-9"
                  >
                    <AlertOctagonIcon size={14} />
                    <span>Report camp destroyed</span>
                  </button>
                )
              )}
            </div>
          </section>
        )}

        {/* All Sector Camps List */}
        <section className="rounded-xl border border-hairline bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-medium text-ink-secondary">Sector aid camps</h3>
            <span className="tabular font-mono text-[11px] text-ink-muted">
              {camps.filter((c) => c.status !== 'DESTROYED').length}/{camps.length} active
            </span>
          </div>
          <div className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline bg-recessed">
            {camps.map((c) => {
              const selected = c.id === selectedCamp?.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCampId(c.id)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs transition-colors duration-150 ease-instrument ${
                    selected
                      ? 'bg-raised text-ink-primary'
                      : 'text-ink-secondary hover:bg-raised/60 hover:text-ink-primary'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusMeta[c.status].dot}`}
                      />
                      <span className="truncate font-medium text-ink-primary">{c.name}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2.5 pl-3.5">
                      <span className="font-mono text-[11px] text-ink-muted">{c.code}</span>
                      <UncertaintyMeter value={c.uncertaintyScore} compact />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`tabular font-mono text-xs font-medium ${
                        c.status === 'DESTROYED'
                          ? 'text-hazard'
                          : c.availableBeds <= 5
                            ? 'text-caution'
                            : 'text-safe'
                      }`}
                    >
                      {c.status === 'DESTROYED' ? 'Destroyed' : `${c.availableBeds} beds`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
