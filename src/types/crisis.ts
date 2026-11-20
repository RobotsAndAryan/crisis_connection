export type CampStatus = 'ACTIVE' | 'OVERCROWDED' | 'DAMAGED' | 'DESTROYED';

export type OperatingMode = 'BASE_CAMP_ONLINE' | 'FIELD_OFFLINE';

export interface Coordinates {
  x: number; // 0..1000 tactical map coordinate
  y: number; // 0..600 tactical map coordinate
}

export interface CampHistoryPoint {
  timestamp: string;
  availableBeds: number;
  safetyLevel: number; // 1 (extreme danger) to 10 (fully secure)
  status: CampStatus;
  note: string;
}

export interface AidCamp {
  id: string;
  code: string;
  name: string;
  sector: string;
  coords: Coordinates;
  lat: number;
  lng: number;
  availableBeds: number;
  totalBeds: number;
  status: CampStatus;
  safetyLevel: number; // 1-10 (higher = safer)
  dangerLevel: number; // 1-10 (higher = more dangerous, inverse of safety)
  capabilities: string[];
  supplies: {
    waterLiters: number;
    traumaKits: number;
    powerHoursLeft: number;
  };
  lastUpdated: string;
  lastUpdatedBy: string;
  uncertaintyScore: number; // 0-100 (% uncertainty)
  uncertaintyNotes: string;
  version: number; // Lamport/vector version for mesh conflict detection
  isMainBase?: boolean;
  history: CampHistoryPoint[];
}

export interface HazardZone {
  id: string;
  name: string;
  type: 'COLLAPSE' | 'FLOOD' | 'AFTERSHOCK' | 'FIRE' | 'ROADBLOCK';
  coords: Coordinates;
  radius: number; // map units
  dangerLevel: number; // 1-10
  active: boolean;
  description: string;
  reportedBy: string;
  timestamp: string;
}

export interface MapNode {
  id: string;
  label: string;
  coords: Coordinates;
  campId?: string;
}

export interface MapEdge {
  from: string;
  to: string;
  distanceKm: number;
  roadCondition: 'CLEAR' | 'DEBRIS' | 'FLOODED' | 'COMPROMISED';
}

export interface ComputedRoute {
  campId: string;
  campName: string;
  nodeIds: string[];
  points: Coordinates[];
  totalDistanceKm: number;
  avgDangerLevel: number;
  maxDangerLevel: number;
  weightedScore: number; // sum(distance * (1 + dangerWeight * dangerLevel))
  etaMinutes: number;
  hazardsCrossed: string[];
}

export interface EmergencyProtocol {
  id: string;
  category: 'CARDIAC' | 'TRAUMA' | 'TRIAGE' | 'BURNS' | 'SANITATION' | 'EVACUATION';
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'STANDARD';
  summary: string;
  steps: string[];
  warnings: string[];
  keywords: string[];
}

export interface FieldReport {
  id: string;
  campId: string;
  campName: string;
  workerId: string;
  workerName: string;
  timestamp: string;
  reportedBeds: number;
  reportedSafety: number; // 1-10
  reportedStatus: CampStatus;
  notes: string;
  photoDataUrl?: string;
  photoLabel?: string;
  source: 'FIELD_WORKER' | 'MESH_PEER' | 'CCTV_SENSOR';
  syncedToCloud: boolean;
  resolved?: boolean;
}

export interface EmergencyAlert {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  campId?: string;
  timestamp: string;
  source: string;
  acknowledged: boolean;
  propagatedViaMesh: boolean;
}

export interface UncertaintyLogEntry {
  id: string;
  timestamp: string;
  campId?: string;
  campName?: string;
  uncertaintyPct: number; // 0-100
  reason: string;
  sourcesInvolved: string[];
  status: 'OPEN' | 'RESOLVED';
  resolutionNote?: string;
}

export interface MeshPeer {
  id: string;
  callsign: string;
  role: string;
  coords: Coordinates;
  lastSyncTime: string;
  dbVersion: number;
  signalStrength: number; // 0-100
  batteryPct: number;
  isLiveTab?: boolean;
  pendingUpdates: number;
}

export interface MeshSyncEvent {
  id: string;
  timestamp: string;
  fromPeer: string;
  toPeer: string;
  cycleIntervalSec: number;
  recordsExchanged: number;
  summary: string;
  channel: 'BROADCAST_CHANNEL' | 'SIMULATED_MESH';
}

export interface CctvBedAnalysisResult {
  campId: string;
  availableBeds: number;
  occupiedBeds: number;
  estimatedTotalBeds: number;
  structuralStatus: CampStatus;
  safetyLevel: number;
  uncertaintyPct: number;
  uncertaintyFactors: string[];
  visualEvidence: string;
  inferenceSource: InferenceSourceLabel;
  latencyMs: number;
}

export interface ResolvedCampUpdate {
  campId: string;
  campName: string;
  previousBeds: number;
  resolvedBeds: number;
  previousSafety: number;
  resolvedSafety: number;
  resolvedStatus: CampStatus;
  uncertaintyPct: number;
  uncertaintyReason: string;
  conflictSummary: string;
  confidenceLabel: 'HIGH' | 'MEDIUM' | 'LOW';
  triggerEmergencyAlert: boolean;
}

export interface ConflictResolutionResult {
  summary: string;
  reconciledCamps: ResolvedCampUpdate[];
  inferenceSource: InferenceSourceLabel;
  latencyMs: number;
  timestamp: string;
}

export interface ShortagePrediction {
  campId: string;
  campName: string;
  resource: string;
  hoursUntilDepletion: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE';
  explanation: string;
}

export interface ShortageForecastResult {
  executiveSummary: string;
  predictions: ShortagePrediction[];
  baseReorganizationPlan: string[];
  systemicPatterns: string[];
  overallUncertaintyPct: number;
  inferenceSource: InferenceSourceLabel;
  latencyMs: number;
  timestamp: string;
}

export type InferenceSourceLabel =
  | 'ON_DEVICE'
  | 'IN_CLOUD'
  | 'LOCAL_FALLBACK_ENGINE';

export interface InferenceTelemetryEntry {
  id: string;
  timestamp: string;
  taskType: 'FIELD_ASSISTANT' | 'MAP_QUERY' | 'CCTV_BED_COUNT' | 'CONFLICT_RESOLUTION' | 'PATTERN_FORECAST';
  requestedMode: string;
  actualSource: InferenceSourceLabel;
  modelName: string;
  latencyMs: number;
  multimodal: boolean;
}

export interface RemoteConfigParams {
  cloudModelName: string;
  defaultInferenceMode: 'prefer_on_device' | 'only_on_device' | 'prefer_in_cloud' | 'only_in_cloud';
  dangerWeight: number;
  meshBaseCycleSec: number;
  emergencyBedThreshold: number;
  fetchedFromCloud: boolean;
}

export interface FieldPackSnapshot {
  downloadedAt: string;
  campCount: number;
  protocolCount: number;
  hazardCount: number;
  checksum: string;
  nanoModelWarmed: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  imageDataUrl?: string;
  voiceUsed?: boolean;
  inferenceSource?: InferenceSourceLabel;
  requestedMode?: string;
  latencyMs?: number;
  sourcesCited?: string[];
  highlightedCampId?: string;
  streaming?: boolean;
}
