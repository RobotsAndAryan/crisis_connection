import {
  AidCamp,
  ComputedRoute,
  Coordinates,
  HazardZone,
  MapEdge,
  MapNode,
} from '../types/crisis';
import { TACTICAL_MAP_EDGES, TACTICAL_MAP_NODES } from '../data/seedData';

function euclidean(a: Coordinates, b: Coordinates): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Minimum distance from point P to line segment AB (to test hazard zone intersections)
function pointToSegmentDistance(p: Coordinates, a: Coordinates, b: Coordinates): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return euclidean(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return euclidean(p, proj);
}

export function findNearestMapNode(pos: Coordinates, nodes: MapNode[] = TACTICAL_MAP_NODES): MapNode {
  let best = nodes[0];
  let bestDist = Infinity;
  for (const node of nodes) {
    const d = euclidean(pos, node.coords);
    if (d < bestDist) {
      bestDist = d;
      best = node;
    }
  }
  return best;
}

interface EdgeEvaluation {
  dangerLevel: number;
  hazardsCrossed: string[];
}

function evaluateEdgeDanger(
  fromNode: MapNode,
  toNode: MapNode,
  edge: MapEdge,
  hazards: HazardZone[]
): EdgeEvaluation {
  let baseDanger = 1;
  if (edge.roadCondition === 'DEBRIS') baseDanger = 3;
  if (edge.roadCondition === 'FLOODED') baseDanger = 5;
  if (edge.roadCondition === 'COMPROMISED') baseDanger = 7;

  const crossed: string[] = [];
  let maxHazard = baseDanger;

  for (const hz of hazards) {
    if (!hz.active) continue;
    const dist = pointToSegmentDistance(hz.coords, fromNode.coords, toNode.coords);
    if (dist <= hz.radius) {
      crossed.push(hz.name);
      maxHazard = Math.max(maxHazard, hz.dangerLevel);
    }
  }

  return { dangerLevel: maxHazard, hazardsCrossed: crossed };
}

/**
 * Computes optimal route from worker position to a specific aid camp using Dijkstra.
 * Whiteboard algorithm:
 *   - Pure shortest mode (`dangerWeight = 0`): minimizes raw distanceKm
 *   - Safest & Shortest mode (`dangerWeight > 0`): minimizes `distance * (1 + dangerWeight * dangerLevel)`
 */
export function computeRouteToCamp(
  workerPos: Coordinates,
  targetCamp: AidCamp,
  hazards: HazardZone[],
  dangerWeight: number,
  nodes: MapNode[] = TACTICAL_MAP_NODES,
  edges: MapEdge[] = TACTICAL_MAP_EDGES
): ComputedRoute | null {
  const nodeMap = new Map<string, MapNode>(nodes.map((n) => [n.id, n]));
  const startNode = findNearestMapNode(workerPos, nodes);
  const targetNode = nodeMap.get(targetCamp.id);
  if (!startNode || !targetNode) return null;

  // Build undirected adjacency list
  const adj = new Map<string, Array<{ to: string; edge: MapEdge }>>();
  for (const n of nodes) adj.set(n.id, []);
  for (const edge of edges) {
    adj.get(edge.from)?.push({ to: edge.to, edge });
    adj.get(edge.to)?.push({ to: edge.from, edge });
  }

  const distCost = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();

  for (const n of nodes) {
    distCost.set(n.id, Infinity);
    prev.set(n.id, null);
  }
  distCost.set(startNode.id, 0);

  while (visited.size < nodes.length) {
    let current: string | null = null;
    let lowest = Infinity;
    for (const [id, cost] of distCost.entries()) {
      if (!visited.has(id) && cost < lowest) {
        lowest = cost;
        current = id;
      }
    }
    if (!current || current === targetNode.id) break;
    visited.add(current);

    const currNode = nodeMap.get(current)!;
    for (const neighbor of adj.get(current) || []) {
      if (visited.has(neighbor.to)) continue;
      const nextNode = nodeMap.get(neighbor.to)!;
      const evalDanger = evaluateEdgeDanger(currNode, nextNode, neighbor.edge, hazards);
      // Core whiteboard formula: distance * danger factor (with strong penalty for severe >=7 hazards)
      const dangerMultiplier =
        evalDanger.dangerLevel >= 7
          ? evalDanger.dangerLevel * 2
          : evalDanger.dangerLevel;
      const edgeWeight =
        dangerWeight === 0
          ? neighbor.edge.distanceKm
          : neighbor.edge.distanceKm * (1 + dangerWeight * dangerMultiplier);

      const candidate = lowest + edgeWeight;
      if (candidate < (distCost.get(neighbor.to) ?? Infinity)) {
        distCost.set(neighbor.to, candidate);
        prev.set(neighbor.to, current);
      }
    }
  }

  // Reconstruct path
  const pathIds: string[] = [];
  let cursor: string | null = targetNode.id;
  while (cursor) {
    pathIds.unshift(cursor);
    cursor = prev.get(cursor) ?? null;
  }
  if (pathIds[0] !== startNode.id) return null;

  // Calculate metrics along path
  let totalDistanceKm = Number((euclidean(workerPos, startNode.coords) / 110).toFixed(2));
  let weightedDangerSum = 0;
  let maxDangerLevel = targetCamp.dangerLevel;
  const hazardsCrossedSet = new Set<string>();

  for (let i = 0; i < pathIds.length - 1; i++) {
    const aId = pathIds[i];
    const bId = pathIds[i + 1];
    const aNode = nodeMap.get(aId)!;
    const bNode = nodeMap.get(bId)!;
    const edge = edges.find(
      (e) => (e.from === aId && e.to === bId) || (e.from === bId && e.to === aId)
    );
    if (!edge) continue;
    const ev = evaluateEdgeDanger(aNode, bNode, edge, hazards);
    totalDistanceKm += edge.distanceKm;
    weightedDangerSum += ev.dangerLevel * edge.distanceKm;
    maxDangerLevel = Math.max(maxDangerLevel, ev.dangerLevel);
    ev.hazardsCrossed.forEach((h) => hazardsCrossedSet.add(h));
  }

  const avgDangerLevel =
    totalDistanceKm > 0
      ? Number(((weightedDangerSum / totalDistanceKm + targetCamp.dangerLevel * 0.35) / 1.35).toFixed(1))
      : targetCamp.dangerLevel;

  // Weighted cost includes camp's own danger score
  const weightedScore = Number(
    (
      totalDistanceKm *
      (1 + Math.max(0.15, dangerWeight) * avgDangerLevel) *
      (targetCamp.status === 'DAMAGED' ? 1.5 : 1)
    ).toFixed(2)
  );

  // Walking/field vehicle speed ~ 18 km/h slowed down by danger/debris
  const effectiveSpeedKmh = Math.max(5, 22 - avgDangerLevel * 1.6);
  const etaMinutes = Math.max(3, Math.round((totalDistanceKm / effectiveSpeedKmh) * 60));

  const points: Coordinates[] = [
    workerPos,
    ...pathIds.map((id) => nodeMap.get(id)!.coords),
  ];

  return {
    campId: targetCamp.id,
    campName: targetCamp.name,
    nodeIds: pathIds,
    points,
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    avgDangerLevel,
    maxDangerLevel,
    weightedScore,
    etaMinutes,
    hazardsCrossed: Array.from(hazardsCrossedSet),
  };
}

export interface BestCampRoutingResult {
  safestOptimalRoute: ComputedRoute | null;
  pureShortestRoute: ComputedRoute | null;
  rankedRoutes: ComputedRoute[];
}

/**
 * Evaluates all operational camps with >= minBeds available and returns:
 *  - `safestOptimalRoute`: best overall by `distance × danger level`
 *  - `pureShortestRoute`: raw shortest path (to contrast dangerous shortcuts on the map!)
 */
export function findBestCampRoutes(
  workerPos: Coordinates,
  camps: AidCamp[],
  hazards: HazardZone[],
  dangerWeight: number,
  minBeds = 1
): BestCampRoutingResult {
  const eligible = camps.filter(
    (c) => c.status !== 'DESTROYED' && c.availableBeds >= minBeds
  );
  const pool = eligible.length > 0 ? eligible : camps.filter((c) => c.status !== 'DESTROYED');

  const safeRoutes: ComputedRoute[] = [];
  const shortRoutes: ComputedRoute[] = [];

  for (const camp of pool) {
    const safeR = computeRouteToCamp(workerPos, camp, hazards, Math.max(0.25, dangerWeight));
    if (safeR) safeRoutes.push(safeR);

    const shortR = computeRouteToCamp(workerPos, camp, hazards, 0);
    if (shortR) shortRoutes.push(shortR);
  }

  safeRoutes.sort((a, b) => a.weightedScore - b.weightedScore);
  shortRoutes.sort((a, b) => a.totalDistanceKm - b.totalDistanceKm);

  return {
    safestOptimalRoute: safeRoutes[0] ?? null,
    pureShortestRoute: shortRoutes[0] ?? null,
    rankedRoutes: safeRoutes,
  };
}
