import { describe, expect, it } from 'vitest';
import {
  INITIAL_AID_CAMPS,
  INITIAL_FIELD_REPORTS,
  INITIAL_HAZARD_ZONES,
  INITIAL_UNCERTAINTY_LOGS,
} from '../../data/seedData';
import { computeRouteToCamp, findBestCampRoutes } from '../pathfinding';
import { computeAdaptiveMeshCycle, mergeMeshCamps } from '../meshSync';
import {
  detectPatternsAndForecastCloud,
  resolveConflictsCloud,
} from '../hybridAI';

describe('Crisis Connection — Safest & Shortest Pathfinding (distance × danger)', () => {
  it('routes around Collapsed Hwy-4 Overpass when heading to Camp East', () => {
    const campEast = INITIAL_AID_CAMPS.find((c) => c.id === 'camp-east')!;
    const workerPos = { x: 450, y: 265 };

    const pureShort = computeRouteToCamp(workerPos, campEast, INITIAL_HAZARD_ZONES, 0)!;
    const safePath = computeRouteToCamp(workerPos, campEast, INITIAL_HAZARD_ZONES, 0.7)!;

    expect(pureShort.hazardsCrossed).toContain('Collapsed Hwy-4 Overpass');
    expect(safePath.hazardsCrossed).not.toContain('Collapsed Hwy-4 Overpass');
    expect(safePath.maxDangerLevel).toBeLessThan(pureShort.maxDangerLevel);
  });

  it('excludes DESTROYED camps from optimal evacuation routes', () => {
    const workerPos = { x: 520, y: 115 }; // right next to St. Jude (camp-north)
    const campsWithNorthDestroyed = INITIAL_AID_CAMPS.map((c) =>
      c.id === 'camp-north' ? { ...c, status: 'DESTROYED' as const, availableBeds: 0 } : c
    );

    const res = findBestCampRoutes(workerPos, campsWithNorthDestroyed, INITIAL_HAZARD_ZONES, 0.45, 1);
    expect(res.safestOptimalRoute).not.toBeNull();
    expect(res.safestOptimalRoute?.campId).not.toBe('camp-north');
  });

  it('dynamically reroutes when a new hazard is dropped on a corridor', () => {
    const campNorth = INITIAL_AID_CAMPS.find((c) => c.id === 'camp-north')!;
    const workerPos = { x: 450, y: 265 };
    const before = computeRouteToCamp(workerPos, campNorth, INITIAL_HAZARD_ZONES, 0.8)!;

    const blockedHazards = [
      ...INITIAL_HAZARD_ZONES,
      {
        id: 'haz-block-direct',
        name: 'Fresh Aftershock Landslide',
        type: 'COLLAPSE' as const,
        coords: { x: 485, y: 185 },
        radius: 65,
        dangerLevel: 10,
        active: true,
        description: 'Blocks direct center-to-north road',
        reportedBy: 'Test Scout',
        timestamp: new Date().toISOString(),
      },
    ];
    const after = computeRouteToCamp(workerPos, campNorth, blockedHazards, 0.8)!;
    expect(after.nodeIds).not.toEqual(before.nodeIds);
    expect(after.hazardsCrossed).not.toContain('Fresh Aftershock Landslide');
  });
});

describe('Crisis Connection — Adaptive X-Cycle Local Mesh Sync', () => {
  it('switches to 4s EMERGENCY_BURST when a critical emergency or destroyed camp exists', () => {
    const cycle = computeAdaptiveMeshCycle({
      baseCycleSec: 15,
      hasCriticalEmergency: true,
      avgUncertaintyPct: 20,
      unsyncedReportCount: 0,
      minPeerBatteryPct: 80,
    });
    expect(cycle.regime).toBe('EMERGENCY_BURST');
    expect(cycle.cycleSec).toBe(4);
  });

  it('switches to BATTERY_SAVER when calm and peer battery drops below 30%', () => {
    const cycle = computeAdaptiveMeshCycle({
      baseCycleSec: 15,
      hasCriticalEmergency: false,
      avgUncertaintyPct: 18,
      unsyncedReportCount: 0,
      minPeerBatteryPct: 22,
    });
    expect(cycle.regime).toBe('BATTERY_SAVER');
    expect(cycle.cycleSec).toBeGreaterThan(15);
  });

  it('propagates DESTROYED status and newer Lamport versions during peer merge', () => {
    const incoming = INITIAL_AID_CAMPS.map((c) =>
      c.id === 'camp-south'
        ? { ...c, status: 'DESTROYED' as const, availableBeds: 0, version: c.version + 1 }
        : c
    );
    const { merged, updatedCount, newlyDestroyed } = mergeMeshCamps(INITIAL_AID_CAMPS, incoming);
    expect(updatedCount).toBe(1);
    expect(newlyDestroyed.map((c) => c.id)).toEqual(['camp-south']);
    expect(merged.find((c) => c.id === 'camp-south')?.status).toBe('DESTROYED');
  });
});

describe('Crisis Connection — Conflict Resolution & Pattern Forecasting', () => {
  it('reconciles conflicting field reports + CCTV bed counts and logs residual uncertainty', async () => {
    const res = await resolveConflictsCloud({
      camps: INITIAL_AID_CAMPS,
      pendingReports: INITIAL_FIELD_REPORTS,
      cctvReadings: [
        {
          campId: 'camp-east',
          availableBeds: 5,
          occupiedBeds: 7,
          estimatedTotalBeds: 12,
          structuralStatus: 'ACTIVE',
          safetyLevel: 5,
          uncertaintyPct: 26,
          uncertaintyFactors: ['Partial smoke occlusion'],
          visualEvidence: '5 open cots observed',
          inferenceSource: 'LOCAL_FALLBACK_ENGINE',
          latencyMs: 12,
        },
      ],
    });

    const eastUpdate = res.reconciledCamps.find((u) => u.campId === 'camp-east');
    expect(eastUpdate).toBeDefined();
    expect(eastUpdate!.resolvedBeds).toBeGreaterThanOrEqual(4);
    expect(eastUpdate!.resolvedBeds).toBeLessThanOrEqual(6);
    expect(eastUpdate!.uncertaintyPct).toBeGreaterThan(0);
  });

  it('produces actionable shortage predictions and reorganization steps from camp history', async () => {
    const forecast = await detectPatternsAndForecastCloud({
      camps: INITIAL_AID_CAMPS,
      hazards: INITIAL_HAZARD_ZONES,
      uncertaintyLogs: INITIAL_UNCERTAINTY_LOGS,
    });
    expect(forecast.predictions.length).toBeGreaterThan(0);
    expect(forecast.baseReorganizationPlan.length).toBeGreaterThan(0);
    expect(forecast.systemicPatterns.length).toBeGreaterThan(0);
  });
});
