import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  AidCamp,
  EmergencyAlert,
  EmergencyProtocol,
  FieldPackSnapshot,
  FieldReport,
  HazardZone,
  UncertaintyLogEntry,
} from '../types/crisis';
import { getFirebaseRuntime } from './firebase';

const STORAGE_KEYS = {
  CAMPS: 'cc_local_camps_v1',
  HAZARDS: 'cc_local_hazards_v1',
  REPORTS: 'cc_local_reports_v1',
  ALERTS: 'cc_local_alerts_v1',
  UNCERTAINTY: 'cc_local_uncertainty_v1',
  SNAPSHOT: 'cc_field_pack_snapshot_v1',
};

export interface LocalDatabaseState {
  camps: AidCamp[];
  hazards: HazardZone[];
  reports: FieldReport[];
  alerts: EmergencyAlert[];
  uncertaintyLogs: UncertaintyLogEntry[];
  snapshot: FieldPackSnapshot | null;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('[CrisisConnection] Local storage quota warning:', err);
  }
}

export function loadLocalDatabase(): Partial<LocalDatabaseState> {
  return {
    camps: readJson<AidCamp[]>(STORAGE_KEYS.CAMPS) ?? undefined,
    hazards: readJson<HazardZone[]>(STORAGE_KEYS.HAZARDS) ?? undefined,
    reports: readJson<FieldReport[]>(STORAGE_KEYS.REPORTS) ?? undefined,
    alerts: readJson<EmergencyAlert[]>(STORAGE_KEYS.ALERTS) ?? undefined,
    uncertaintyLogs: readJson<UncertaintyLogEntry[]>(STORAGE_KEYS.UNCERTAINTY) ?? undefined,
    snapshot: readJson<FieldPackSnapshot>(STORAGE_KEYS.SNAPSHOT) ?? null,
  };
}

export function persistLocalDatabase(state: {
  camps: AidCamp[];
  hazards: HazardZone[];
  reports: FieldReport[];
  alerts: EmergencyAlert[];
  uncertaintyLogs: UncertaintyLogEntry[];
}): void {
  writeJson(STORAGE_KEYS.CAMPS, state.camps);
  writeJson(STORAGE_KEYS.HAZARDS, state.hazards);
  writeJson(STORAGE_KEYS.REPORTS, state.reports);
  writeJson(STORAGE_KEYS.ALERTS, state.alerts);
  writeJson(STORAGE_KEYS.UNCERTAINTY, state.uncertaintyLogs);
}

export function createFieldDepartureSnapshot(
  camps: AidCamp[],
  hazards: HazardZone[],
  protocols: EmergencyProtocol[],
  nanoModelWarmed: boolean
): FieldPackSnapshot {
  const payload = JSON.stringify({
    camps: camps.map((c) => `${c.id}:${c.availableBeds}:${c.version}`),
    hazards: hazards.length,
    protocols: protocols.length,
  });
  // Lightweight deterministic checksum for snapshot verification
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const checksum = `CC-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;

  const snapshot: FieldPackSnapshot = {
    downloadedAt: new Date().toISOString(),
    campCount: camps.length,
    protocolCount: protocols.length,
    hazardCount: hazards.filter((h) => h.active).length,
    checksum,
    nanoModelWarmed,
  };
  writeJson(STORAGE_KEYS.SNAPSHOT, snapshot);
  return snapshot;
}

export function clearLocalDatabase(): void {
  Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
}

// --- Firestore Cloud Sync (active when Firebase is configured & in BASE_CAMP_ONLINE mode) ---

export async function syncStateToFirestore(state: {
  camps: AidCamp[];
  alerts: EmergencyAlert[];
  uncertaintyLogs: UncertaintyLogEntry[];
}): Promise<{ synced: boolean; count: number; error?: string }> {
  const { db, configured } = getFirebaseRuntime();
  if (!configured || !db) {
    return { synced: false, count: 0 };
  }

  try {
    const batch = writeBatch(db);
    let count = 0;

    for (const camp of state.camps) {
      batch.set(doc(db, 'aidCamps', camp.id), camp, { merge: true });
      count++;
    }
    for (const alert of state.alerts.slice(0, 15)) {
      batch.set(doc(db, 'emergencyAlerts', alert.id), alert, { merge: true });
      count++;
    }
    for (const unc of state.uncertaintyLogs.slice(0, 20)) {
      batch.set(doc(db, 'uncertaintyLogs', unc.id), unc, { merge: true });
      count++;
    }

    await batch.commit();
    return { synced: true, count };
  } catch (err) {
    return {
      synced: false,
      count: 0,
      error: err instanceof Error ? err.message : 'Firestore write error',
    };
  }
}

export async function saveFieldReportToFirestore(report: FieldReport): Promise<boolean> {
  const { db, configured } = getFirebaseRuntime();
  if (!configured || !db) return false;
  try {
    const { photoDataUrl, ...withoutHugePhoto } = report;
    await setDoc(
      doc(db, 'fieldReports', report.id),
      {
        ...withoutHugePhoto,
        hasPhoto: Boolean(photoDataUrl),
        syncedToCloud: true,
      },
      { merge: true }
    );
    return true;
  } catch {
    return false;
  }
}

export async function pullCampsFromFirestore(): Promise<AidCamp[] | null> {
  const { db, configured } = getFirebaseRuntime();
  if (!configured || !db) return null;
  try {
    const snap = await getDocs(collection(db, 'aidCamps'));
    if (snap.empty) return null;
    return snap.docs.map((d) => d.data() as AidCamp);
  } catch {
    return null;
  }
}
