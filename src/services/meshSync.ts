import { AidCamp, EmergencyAlert, FieldReport } from '../types/crisis';

const MESH_CHANNEL_NAME = 'crisis-connection-local-mesh-v1';

export interface MeshPacket {
  type: 'MESH_GOSSIP_SYNC' | 'MESH_PING' | 'MESH_PONG';
  senderId: string;
  senderCallsign: string;
  timestamp: string;
  cycleSec: number;
  camps?: AidCamp[];
  alerts?: EmergencyAlert[];
  reports?: FieldReport[];
}

export interface AdaptiveCycleResult {
  cycleSec: number;
  regime: 'EMERGENCY_BURST' | 'DIVERGENCE_CATCHUP' | 'NORMAL_PATROL' | 'BATTERY_SAVER';
  reason: string;
}

/**
 * Whiteboard: "In X cycle (to be determined by algorithm), phones communicate
 * to locally update databases between devices."
 *
 * Adaptive X-Cycle Algorithm:
 * Dynamically adjusts gossip period X based on:
 *   1. Active CRITICAL alerts or destroyed camps (rapid 4s burst propagation)
 *   2. Average database uncertainty / unsynced pending reports (8s catchup)
 *   3. Low peer battery reserve (stretches cycle up to 25s to conserve power)
 */
export function computeAdaptiveMeshCycle(params: {
  baseCycleSec: number;
  hasCriticalEmergency: boolean;
  avgUncertaintyPct: number;
  unsyncedReportCount: number;
  minPeerBatteryPct: number;
}): AdaptiveCycleResult {
  const {
    baseCycleSec,
    hasCriticalEmergency,
    avgUncertaintyPct,
    unsyncedReportCount,
    minPeerBatteryPct,
  } = params;

  if (hasCriticalEmergency) {
    return {
      cycleSec: 4,
      regime: 'EMERGENCY_BURST',
      reason: 'Critical emergency or destroyed camp detected: accelerated 4s local mesh flood.',
    };
  }

  if (unsyncedReportCount >= 2 || avgUncertaintyPct >= 45) {
    return {
      cycleSec: Math.max(6, Math.round(baseCycleSec * 0.55)),
      regime: 'DIVERGENCE_CATCHUP',
      reason: `High DB uncertainty (${Math.round(avgUncertaintyPct)}%) or ${unsyncedReportCount} queued field updates: tightening sync cycle.`,
    };
  }

  if (minPeerBatteryPct < 30) {
    return {
      cycleSec: Math.min(30, Math.round(baseCycleSec * 1.65)),
      regime: 'BATTERY_SAVER',
      reason: `Low field handset battery (${minPeerBatteryPct}%): conserving radio duty cycle.`,
    };
  }

  return {
    cycleSec: baseCycleSec,
    regime: 'NORMAL_PATROL',
    reason: 'Nominal sector state: standard peer gossip cadence from Remote Config.',
  };
}

/**
 * Merges incoming mesh camp snapshots using version-vector comparison
 * (higher Lamport version wins; DESTROYED status propagates with highest priority).
 */
export function mergeMeshCamps(
  localCamps: AidCamp[],
  incomingCamps: AidCamp[]
): { merged: AidCamp[]; updatedCount: number; newlyDestroyed: AidCamp[] } {
  const incomingMap = new Map(incomingCamps.map((c) => [c.id, c]));
  let updatedCount = 0;
  const newlyDestroyed: AidCamp[] = [];

  const merged = localCamps.map((local) => {
    const remote = incomingMap.get(local.id);
    if (!remote) return local;

    const remoteIsDestroyed = remote.status === 'DESTROYED' && local.status !== 'DESTROYED';
    const remoteIsNewer = remote.version > local.version;

    if (remoteIsDestroyed || remoteIsNewer) {
      updatedCount++;
      if (remoteIsDestroyed) newlyDestroyed.push(remote);
      return {
        ...remote,
        lastUpdatedBy: `${remote.lastUpdatedBy} (via Mesh)`,
      };
    }
    return local;
  });

  return { merged, updatedCount, newlyDestroyed };
}

export class LocalMeshTransceiver {
  private channel: BroadcastChannel | null = null;
  public readonly deviceId: string;
  public readonly callsign: string;

  constructor(onPacket: (packet: MeshPacket) => void) {
    this.deviceId = `handset-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    this.callsign = `ALPHA-${Math.floor(10 + Math.random() * 89)}`;

    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(MESH_CHANNEL_NAME);
      this.channel.onmessage = (event: MessageEvent<MeshPacket>) => {
        if (event.data && event.data.senderId !== this.deviceId) {
          onPacket(event.data);
        }
      };
    }
  }

  broadcast(packet: Omit<MeshPacket, 'senderId' | 'senderCallsign' | 'timestamp'>): void {
    if (!this.channel) return;
    this.channel.postMessage({
      ...packet,
      senderId: this.deviceId,
      senderCallsign: this.callsign,
      timestamp: new Date().toISOString(),
    });
  }

  close(): void {
    this.channel?.close();
  }
}
