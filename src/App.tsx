/*
 * Design Direction (Crisis Connection — Matte Graphite Field Instrument)
 * - Mode: Operate (humanitarian dispatch, field triage, peer mesh sync, and cloud reconciliation).
 * - Character: Taut, legible, field-rugged.
 * - World: Topographic SAR field maps, handheld emergency radios, and medical dispatch boards (matte mineral graphite ramp, IBM Plex Sans + Mono, off-white primary actions, single radio-steel accent).
 * - Moments: (1) Sector Meridian topographic map with UTM ticks, relief contours, hatched hazard exclusion zones, dual-route comparison, and collision-free labels; (2) Cloud ward CCTV monitor paired with structured reconciliation diff.
 * - Signature: Calibrated 10-tick hairline UncertaintyMeter paired with monospace camp callsigns, Lamport versions, and 6-hour bed depletion history.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InferenceMode } from 'firebase/ai';
import {
  AidCamp,
  CctvBedAnalysisResult,
  ChatMessage,
  ConflictResolutionResult,
  Coordinates,
  EmergencyAlert,
  FieldPackSnapshot,
  FieldReport,
  HazardZone,
  InferenceTelemetryEntry,
  MeshPeer,
  MeshSyncEvent,
  OperatingMode,
  ShortageForecastResult,
  UncertaintyLogEntry,
} from './types/crisis';
import {
  INITIAL_AID_CAMPS,
  INITIAL_ALERTS,
  INITIAL_FIELD_REPORTS,
  INITIAL_HAZARD_ZONES,
  INITIAL_MESH_PEERS,
  INITIAL_PROTOCOLS,
  INITIAL_UNCERTAINTY_LOGS,
} from './data/seedData';
import {
  FirebaseRuntimeState,
  getFirebaseRuntime,
  initFirebaseServices,
} from './services/firebase';
import {
  analyzeCctvImageCloud,
  checkOnDeviceNanoStatus,
  detectPatternsAndForecastCloud,
  OnDeviceCapabilityStatus,
  queryFieldAssistantStream,
  resolveConflictsCloud,
  warmUpOnDeviceNanoModel,
} from './services/hybridAI';
import {
  clearLocalDatabase,
  createFieldDepartureSnapshot,
  loadLocalDatabase,
  persistLocalDatabase,
  pullCampsFromFirestore,
  saveFieldReportToFirestore,
  syncStateToFirestore,
} from './services/localStorageDb';
import {
  computeAdaptiveMeshCycle,
  LocalMeshTransceiver,
  mergeMeshCamps,
  MeshPacket,
} from './services/meshSync';
import { SampleCctvPreset } from './utils/cctvGenerator';
import { ActiveTab, TopCommandBar } from './components/TopCommandBar';
import { TacticalMapView } from './components/TacticalMapView';
import { FieldAssistantView } from './components/FieldAssistantView';
import { LocalMeshView } from './components/LocalMeshView';
import { CloudCommandView } from './components/CloudCommandView';
import { FirebaseDiagnosticsModal } from './components/FirebaseDiagnosticsModal';
import { ClosedLoopBanner } from './components/ClosedLoopBanner';
import { DemoWalkthroughDrawer } from './components/DemoWalkthroughDrawer';

interface ToastState {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-msg',
    role: 'assistant',
    text: `**Field assistant ready**\n\nQueries run against your local aid camp database, danger-weighted map routes, and cached CPR and trauma protocols via Firebase AI Logic (Gemini Nano 4 on-device, with Cloud Gemini fallback when online).\n\nAsk for the closest safe aid camp, CPR or tourniquet steps, attach a ward or injury photo, or use voice input.`,
    timestamp: new Date().toISOString(),
    sourcesCited: ['Local aid camp DB', 'Offline protocols'],
  },
];

function getInitialTab(): ActiveTab {
  if (typeof window === 'undefined') return 'map';
  const param = new URLSearchParams(window.location.search).get('tab');
  if (param === 'map' || param === 'field' || param === 'mesh' || param === 'cloud') {
    return param;
  }
  return 'map';
}

export function App() {
  const cached = useMemo(() => loadLocalDatabase(), []);

  const [activeTab, setActiveTab] = useState<ActiveTab>(getInitialTab);
  const [operatingMode, setOperatingMode] = useState<OperatingMode>(
    typeof navigator !== 'undefined' && !navigator.onLine
      ? 'FIELD_OFFLINE'
      : 'BASE_CAMP_ONLINE'
  );

  const [camps, setCamps] = useState<AidCamp[]>(cached.camps ?? INITIAL_AID_CAMPS);
  const [hazards, setHazards] = useState<HazardZone[]>(cached.hazards ?? INITIAL_HAZARD_ZONES);
  const [reports, setReports] = useState<FieldReport[]>(cached.reports ?? INITIAL_FIELD_REPORTS);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>(cached.alerts ?? INITIAL_ALERTS);
  const [uncertaintyLogs, setUncertaintyLogs] = useState<UncertaintyLogEntry[]>(
    cached.uncertaintyLogs ?? INITIAL_UNCERTAINTY_LOGS
  );
  const [snapshot, setSnapshot] = useState<FieldPackSnapshot | null>(cached.snapshot ?? null);

  const [workerPos, setWorkerPos] = useState<Coordinates>({ x: 450, y: 265 });
  const [dangerWeight, setDangerWeight] = useState<number>(0.45);
  const [defaultReportCampId, setDefaultReportCampId] = useState<string>('camp-east');

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [cctvReadings, setCctvReadings] = useState<CctvBedAnalysisResult[]>([]);
  const [lastResolution, setLastResolution] = useState<ConflictResolutionResult | null>(null);
  const [lastForecast, setLastForecast] = useState<ShortageForecastResult | null>(null);

  const [peers, setPeers] = useState<MeshPeer[]>(INITIAL_MESH_PEERS);
  const [syncEvents, setSyncEvents] = useState<MeshSyncEvent[]>([]);
  const [telemetry, setTelemetry] = useState<InferenceTelemetryEntry[]>([]);

  const [firebaseState, setFirebaseState] = useState<FirebaseRuntimeState>(getFirebaseRuntime());
  const [nanoStatus, setNanoStatus] = useState<OnDeviceCapabilityStatus>({
    chromePromptApiDetected: false,
    availability: 'unsupported',
    detail: 'Checking Chrome Gemini Nano 4 status...',
  });

  const [downloadingPack, setDownloadingPack] = useState(false);
  const [nanoDownloadProgress, setNanoDownloadProgress] = useState<number | null>(null);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [demoGuideOpen, setDemoGuideOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const transceiverRef = useRef<LocalMeshTransceiver | null>(null);
  const [deviceCallsign, setDeviceCallsign] = useState<string>('ALPHA-01');

  const campsRef = useRef(camps);
  const alertsRef = useRef(alerts);
  const reportsRef = useRef(reports);
  campsRef.current = camps;
  alertsRef.current = alerts;
  reportsRef.current = reports;

  const showToast = useCallback(
    (
      message: string,
      opts?: { actionLabel?: string; onAction?: () => void; durationMs?: number }
    ) => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      setToast({ message, actionLabel: opts?.actionLabel, onAction: opts?.onAction });
      toastTimerRef.current = window.setTimeout(() => {
        setToast((curr) => (curr?.message === message ? null : curr));
      }, opts?.durationMs ?? 4200);
    },
    []
  );

  // Keyboard shortcuts: 1-4 switch workspace tabs when not typing in an input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === '1') setActiveTab('map');
      else if (e.key === '2') setActiveTab('field');
      else if (e.key === '3') setActiveTab('mesh');
      else if (e.key === '4') setActiveTab('cloud');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const recordTelemetry = useCallback((entry: Omit<InferenceTelemetryEntry, 'id' | 'timestamp'>) => {
    setTelemetry((prev) => [
      {
        ...entry,
        id: `tel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
      },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const bootstrapFirebase = useCallback(async () => {
    const state = await initFirebaseServices();
    setFirebaseState(state);
    setDangerWeight(state.remoteParams.dangerWeight);

    if (state.configured) {
      const cloudCamps = await pullCampsFromFirestore();
      if (cloudCamps && cloudCamps.length > 0) {
        setCamps(cloudCamps);
      }
    }
  }, []);

  const refreshNano = useCallback(async () => {
    const st = await checkOnDeviceNanoStatus();
    setNanoStatus(st);
  }, []);

  useEffect(() => {
    bootstrapFirebase();
    refreshNano();
  }, [bootstrapFirebase, refreshNano]);

  useEffect(() => {
    const goOffline = () => {
      setOperatingMode('FIELD_OFFLINE');
      showToast('Network lost. Switched to Field offline mode (Nano 4 and local mesh)');
    };
    const goOnline = () => {
      setOperatingMode('BASE_CAMP_ONLINE');
      showToast('Network restored. Base camp cloud sync available');
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [showToast]);

  useEffect(() => {
    persistLocalDatabase({ camps, hazards, reports, alerts, uncertaintyLogs });
  }, [camps, hazards, reports, alerts, uncertaintyLogs]);

  const adaptiveCycle = useMemo(() => {
    const hasCriticalEmergency =
      camps.some((c) => c.status === 'DESTROYED') ||
      alerts.some((a) => !a.acknowledged && a.severity === 'CRITICAL');
    const avgUncertaintyPct =
      camps.reduce((sum, c) => sum + c.uncertaintyScore, 0) / Math.max(1, camps.length);
    const unsyncedReportCount = reports.filter((r) => !r.resolved).length;
    const minPeerBatteryPct = Math.min(...peers.map((p) => p.batteryPct), 100);

    return computeAdaptiveMeshCycle({
      baseCycleSec: firebaseState.remoteParams.meshBaseCycleSec,
      hasCriticalEmergency,
      avgUncertaintyPct,
      unsyncedReportCount,
      minPeerBatteryPct,
    });
  }, [camps, alerts, reports, peers, firebaseState.remoteParams.meshBaseCycleSec]);

  const [secondsToNextCycle, setSecondsToNextCycle] = useState<number>(adaptiveCycle.cycleSec);

  useEffect(() => {
    const handlePacket = (packet: MeshPacket) => {
      if (packet.type === 'MESH_PING') {
        transceiverRef.current?.broadcast({
          type: 'MESH_PONG',
          cycleSec: adaptiveCycle.cycleSec,
          camps: campsRef.current,
          alerts: alertsRef.current,
        });
      }

      setPeers((prev) => {
        const exists = prev.some((p) => p.id === packet.senderId);
        const livePeer: MeshPeer = {
          id: packet.senderId,
          callsign: packet.senderCallsign,
          role: 'Live tab handset',
          coords: { x: 495, y: 295 },
          lastSyncTime: packet.timestamp,
          dbVersion: Math.max(...(packet.camps?.map((c) => c.version) ?? [14])),
          signalStrength: 98,
          batteryPct: 95,
          isLiveTab: true,
          pendingUpdates: packet.reports?.length ?? 0,
        };
        return exists
          ? prev.map((p) => (p.id === packet.senderId ? livePeer : p))
          : [livePeer, ...prev];
      });

      if (packet.camps && packet.camps.length > 0) {
        const { merged, updatedCount, newlyDestroyed } = mergeMeshCamps(
          campsRef.current,
          packet.camps
        );
        if (updatedCount > 0) {
          setCamps(merged);
          setSyncEvents((prev) => [
            {
              id: `mesh-${Date.now()}`,
              timestamp: new Date().toISOString(),
              fromPeer: packet.senderCallsign,
              toPeer: transceiverRef.current?.callsign ?? 'THIS',
              cycleIntervalSec: packet.cycleSec,
              recordsExchanged: updatedCount,
              summary:
                newlyDestroyed.length > 0
                  ? `Critical mesh relay: received destroyed status for ${newlyDestroyed.map((c) => c.name).join(', ')}.`
                  : `Merged ${updatedCount} newer camp record(s) from live peer tab.`,
              channel: 'BROADCAST_CHANNEL',
            },
            ...prev.slice(0, 29),
          ]);
          showToast(
            `Local mesh synced ${updatedCount} camp update(s) from ${packet.senderCallsign}`
          );
        }
      }

      if (packet.alerts && packet.alerts.length > 0) {
        setAlerts((prev) => {
          const existingIds = new Set(prev.map((a) => a.id));
          const fresh = packet.alerts!.filter((a) => !existingIds.has(a.id));
          return fresh.length > 0 ? [...fresh, ...prev] : prev;
        });
      }

      if (packet.reports && packet.reports.length > 0) {
        setReports((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const fresh = packet.reports!.filter((r) => !existingIds.has(r.id));
          return fresh.length > 0 ? [...fresh, ...prev] : prev;
        });
      }
    };

    const transceiver = new LocalMeshTransceiver(handlePacket);
    transceiverRef.current = transceiver;
    setDeviceCallsign(transceiver.callsign);

    transceiver.broadcast({
      type: 'MESH_PING',
      cycleSec: 15,
      camps: campsRef.current,
      alerts: alertsRef.current,
    });

    return () => transceiver.close();
  }, [showToast]);

  const triggerMeshGossip = useCallback(
    (manual = false) => {
      transceiverRef.current?.broadcast({
        type: 'MESH_GOSSIP_SYNC',
        cycleSec: adaptiveCycle.cycleSec,
        camps: campsRef.current,
        alerts: alertsRef.current,
        reports: reportsRef.current.filter((r) => !r.resolved),
      });

      const maxVer = Math.max(...campsRef.current.map((c) => c.version), 1);
      setPeers((prev) =>
        prev.map((p) => ({
          ...p,
          lastSyncTime: new Date().toISOString(),
          dbVersion: Math.max(p.dbVersion, maxVer),
          pendingUpdates: 0,
        }))
      );

      setSyncEvents((prev) => [
        {
          id: `mesh-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          timestamp: new Date().toISOString(),
          fromPeer: deviceCallsign,
          toPeer: `${peers.length} nearby handsets`,
          cycleIntervalSec: adaptiveCycle.cycleSec,
          recordsExchanged: campsRef.current.length,
          summary: manual
            ? `Manual gossip broadcast (${campsRef.current.length} camps, ${alertsRef.current.filter((a) => !a.acknowledged).length} active alerts) over local mesh.`
            : `Scheduled ${adaptiveCycle.cycleSec}s (${adaptiveCycle.regime.toLowerCase().replace('_', ' ')}) peer heartbeat completed.`,
          channel: peers.some((p) => p.isLiveTab) ? 'BROADCAST_CHANNEL' : 'SIMULATED_MESH',
        },
        ...prev.slice(0, 29),
      ]);

      if (manual) {
        showToast(`Local mesh gossip sent to ${peers.length} peer handsets`);
      }
    },
    [adaptiveCycle.cycleSec, adaptiveCycle.regime, deviceCallsign, peers, showToast]
  );

  useEffect(() => {
    setSecondsToNextCycle(adaptiveCycle.cycleSec);
    const id = setInterval(() => {
      setSecondsToNextCycle((sec) => {
        if (sec <= 1) {
          triggerMeshGossip(false);
          return adaptiveCycle.cycleSec;
        }
        return sec - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [adaptiveCycle.cycleSec, triggerMeshGossip]);

  const handleDownloadFieldPack = async () => {
    setDownloadingPack(true);
    setNanoDownloadProgress(0);
    try {
      const warmRes = await warmUpOnDeviceNanoModel((pct) => setNanoDownloadProgress(pct));
      await refreshNano();
      const snap = createFieldDepartureSnapshot(
        camps,
        hazards,
        INITIAL_PROTOCOLS,
        warmRes.ready
      );
      setSnapshot(snap);
      showToast(
        warmRes.ready
          ? `Field pack ${snap.checksum} ready. Gemini Nano 4 initialized for offline inference`
          : `Offline DB pack ${snap.checksum} cached (${warmRes.message})`
      );
    } finally {
      setDownloadingPack(false);
      setNanoDownloadProgress(null);
    }
  };

  const handleMarkCampDestroyed = (campId: string) => {
    const target = camps.find((c) => c.id === campId);
    if (!target) return;

    const priorCamps = camps;
    const now = new Date().toISOString();
    const alertId = `alert-destroyed-${Date.now()}`;
    const reportId = `rep-destroyed-${Date.now()}`;

    const updatedCamps: AidCamp[] = camps.map((c) =>
      c.id === campId
        ? {
            ...c,
            status: 'DESTROYED',
            availableBeds: 0,
            safetyLevel: 1,
            dangerLevel: 10,
            uncertaintyScore: 15,
            uncertaintyNotes: `Confirmed destroyed via field emergency broadcast (${deviceCallsign}). Routes diverted.`,
            lastUpdated: now,
            lastUpdatedBy: `${deviceCallsign} (Emergency Alert)`,
            version: c.version + 3,
            history: [
              ...c.history,
              {
                timestamp: now,
                availableBeds: 0,
                safetyLevel: 1,
                status: 'DESTROYED',
                note: 'Camp destroyed: emergency evacuation broadcast',
              },
            ],
          }
        : c
    );

    const emergencyAlert: EmergencyAlert = {
      id: alertId,
      severity: 'CRITICAL',
      title: `Camp destroyed: ${target.name} (${target.code})`,
      message: `Reported by ${deviceCallsign}. Cloud DB and mesh peers alerted; safest route diverted to remaining active camps.`,
      campId: target.id,
      timestamp: now,
      source:
        operatingMode === 'FIELD_OFFLINE' ? `Local Mesh (${deviceCallsign})` : 'Base Camp Cloud',
      acknowledged: false,
      propagatedViaMesh: true,
    };

    const destructionReport: FieldReport = {
      id: reportId,
      campId: target.id,
      campName: target.name,
      workerId: deviceCallsign,
      workerName: `${deviceCallsign} (Emergency)`,
      timestamp: now,
      reportedBeds: 0,
      reportedSafety: 1,
      reportedStatus: 'DESTROYED',
      notes: 'Camp inoperable. Immediate fleet-wide rerouting activated.',
      source: 'FIELD_WORKER',
      syncedToCloud: operatingMode === 'BASE_CAMP_ONLINE',
    };

    setCamps(updatedCamps);
    setAlerts((prev) => [emergencyAlert, ...prev]);
    setReports((prev) => [destructionReport, ...prev]);

    transceiverRef.current?.broadcast({
      type: 'MESH_GOSSIP_SYNC',
      cycleSec: 4,
      camps: updatedCamps,
      alerts: [emergencyAlert],
      reports: [destructionReport],
    });

    if (operatingMode === 'BASE_CAMP_ONLINE') {
      syncStateToFirestore({
        camps: updatedCamps,
        alerts: [emergencyAlert, ...alerts],
        uncertaintyLogs,
      });
    }

    showToast(`Emergency alert sent: ${target.name} marked destroyed`, {
      durationMs: 10000,
      actionLabel: 'Undo',
      onAction: () => {
        setCamps(priorCamps);
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
        setReports((prev) => prev.filter((r) => r.id !== reportId));
        showToast(`Restored ${target.name} to prior status`);
      },
    });
  };

  const handleAddHazardZone = (coords: Coordinates) => {
    const newHz: HazardZone = {
      id: `haz-custom-${Date.now()}`,
      name: `Field Hazard #${hazards.length + 1}`,
      type: 'AFTERSHOCK',
      coords,
      radius: 65,
      dangerLevel: 8,
      active: true,
      description: `Reported by ${deviceCallsign} at (${coords.x}, ${coords.y}). Safest route updated.`,
      reportedBy: deviceCallsign,
      timestamp: new Date().toISOString(),
    };
    setHazards((prev) => [...prev, newHz]);
    showToast('Added danger 8/10 hazard zone and recalculated safest route');
  };

  const handleAskMapLocally = async (query: string) => {
    const res = await queryFieldAssistantStream({
      query,
      operatingMode,
      workerPos,
      camps,
      hazards,
      protocols: INITIAL_PROTOCOLS,
      dangerWeight,
    });
    recordTelemetry({
      taskType: 'MAP_QUERY',
      requestedMode: res.requestedMode,
      actualSource: res.inferenceSource,
      modelName: res.modelName,
      latencyMs: res.latencyMs,
      multimodal: false,
    });
    return res;
  };

  const handleSendFieldMessage = async (params: {
    query: string;
    imageDataUrl?: string;
    voiceUsed?: boolean;
    overrideMode?: InferenceMode;
  }) => {
    const userMsg: ChatMessage = {
      id: `msg-u-${Date.now()}`,
      role: 'user',
      text: params.query,
      imageDataUrl: params.imageDataUrl,
      voiceUsed: params.voiceUsed,
      timestamp: new Date().toISOString(),
    };
    const assistantId = `msg-a-${Date.now() + 1}`;
    const placeholder: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      text: '',
      timestamp: new Date().toISOString(),
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, placeholder]);

    const res = await queryFieldAssistantStream({
      query: params.query,
      operatingMode,
      overrideInferenceMode: params.overrideMode,
      workerPos,
      camps,
      hazards,
      protocols: INITIAL_PROTOCOLS,
      dangerWeight,
      imageDataUrl: params.imageDataUrl,
      onChunk: (partial) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, text: partial } : m))
        );
      },
    });

    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? {
              ...m,
              text: res.text,
              inferenceSource: res.inferenceSource,
              requestedMode: res.requestedMode,
              latencyMs: res.latencyMs,
              sourcesCited: res.sourcesCited,
              highlightedCampId: res.highlightedCampId,
              streaming: false,
            }
          : m
      )
    );

    recordTelemetry({
      taskType: 'FIELD_ASSISTANT',
      requestedMode: res.requestedMode,
      actualSource: res.inferenceSource,
      modelName: res.modelName,
      latencyMs: res.latencyMs,
      multimodal: Boolean(params.imageDataUrl),
    });
  };

  const handleSubmitFieldReport = (
    payload: Omit<FieldReport, 'id' | 'timestamp' | 'syncedToCloud'>
  ) => {
    if (payload.reportedStatus === 'DESTROYED') {
      handleMarkCampDestroyed(payload.campId);
      return;
    }

    const newReport: FieldReport = {
      ...payload,
      id: `rep-${Date.now()}`,
      timestamp: new Date().toISOString(),
      syncedToCloud: false,
    };

    setReports((prev) => [newReport, ...prev]);

    const existingCamp = camps.find((c) => c.id === payload.campId);
    if (existingCamp && Math.abs(existingCamp.availableBeds - payload.reportedBeds) >= 3) {
      const uncEntry: UncertaintyLogEntry = {
        id: `unc-${Date.now()}`,
        timestamp: new Date().toISOString(),
        campId: existingCamp.id,
        campName: existingCamp.name,
        uncertaintyPct: Math.min(
          80,
          35 + Math.abs(existingCamp.availableBeds - payload.reportedBeds) * 3
        ),
        reason: `New field report (${payload.reportedBeds} beds) conflicts with cached DB (${existingCamp.availableBeds} beds). Queued for Cloud Gemini reconciliation.`,
        sourcesInvolved: [payload.workerName, 'Cached Aid Camp DB'],
        status: 'OPEN',
      };
      setUncertaintyLogs((prev) => [uncEntry, ...prev]);
    }

    transceiverRef.current?.broadcast({
      type: 'MESH_GOSSIP_SYNC',
      cycleSec: adaptiveCycle.cycleSec,
      reports: [newReport],
    });

    if (operatingMode === 'BASE_CAMP_ONLINE') {
      saveFieldReportToFirestore(newReport);
    }

    showToast(`Field report logged for ${payload.campName} and shared on local mesh`);
  };

  const handleSimulateIncomingPeerReport = () => {
    const target = camps.find((c) => c.id === 'camp-north') ?? camps[0];
    const simulatedBeds = Math.max(2, target.availableBeds - 4);
    const peerRep: FieldReport = {
      id: `rep-mesh-${Date.now()}`,
      campId: target.id,
      campName: target.name,
      workerId: 'peer-bravo',
      workerName: 'BRAVO-2 (Mesh Peer)',
      timestamp: new Date().toISOString(),
      reportedBeds: simulatedBeds,
      reportedSafety: Math.max(3, target.safetyLevel - 1),
      reportedStatus: simulatedBeds <= 4 ? 'OVERCROWDED' : 'ACTIVE',
      notes: `Peer mesh update: ambulance surge arrived at ${target.name}; ${simulatedBeds} open beds remaining.`,
      source: 'MESH_PEER',
      syncedToCloud: false,
    };

    setReports((prev) => [peerRep, ...prev]);
    setSyncEvents((prev) => [
      {
        id: `mesh-sim-${Date.now()}`,
        timestamp: new Date().toISOString(),
        fromPeer: 'BRAVO-2',
        toPeer: deviceCallsign,
        cycleIntervalSec: adaptiveCycle.cycleSec,
        recordsExchanged: 1,
        summary: `Received offline peer update for ${target.name} (${simulatedBeds} open beds).`,
        channel: 'SIMULATED_MESH',
      },
      ...prev.slice(0, 29),
    ]);
    showToast(`Received offline mesh update from BRAVO-2 for ${target.name}`);
  };

  const handleAnalyzeCctv = async (params: {
    campId: string;
    imageDataUrl: string;
    presetHint?: SampleCctvPreset;
  }) => {
    const camp = camps.find((c) => c.id === params.campId);
    if (!camp) return;

    const result = await analyzeCctvImageCloud({
      camp,
      imageDataUrl: params.imageDataUrl,
      hintContext: params.presetHint,
    });

    setCctvReadings((prev) => [result, ...prev.filter((r) => r.campId !== result.campId)]);
    recordTelemetry({
      taskType: 'CCTV_BED_COUNT',
      requestedMode: InferenceMode.ONLY_IN_CLOUD,
      actualSource: result.inferenceSource,
      modelName: firebaseState.remoteParams.cloudModelName,
      latencyMs: result.latencyMs,
      multimodal: true,
    });
    showToast(
      `CCTV count for ${camp.name}: ${result.availableBeds} open beds (${result.uncertaintyPct}% uncertainty)`
    );
  };

  const handleResolveConflicts = async () => {
    const unresolved = reports.filter((r) => !r.resolved);
    const result = await resolveConflictsCloud({
      camps,
      pendingReports: unresolved,
      cctvReadings,
    });
    setLastResolution(result);
    recordTelemetry({
      taskType: 'CONFLICT_RESOLUTION',
      requestedMode: InferenceMode.ONLY_IN_CLOUD,
      actualSource: result.inferenceSource,
      modelName: firebaseState.remoteParams.cloudModelName,
      latencyMs: result.latencyMs,
      multimodal: false,
    });
    showToast(`Reconciled ${result.reconciledCamps.length} aid camp(s). Review and commit`);
  };

  const handleCommitResolution = async () => {
    if (!lastResolution) return;
    const now = new Date().toISOString();

    const updateMap = new Map(lastResolution.reconciledCamps.map((u) => [u.campId, u]));

    const nextCamps: AidCamp[] = camps.map((c) => {
      const u = updateMap.get(c.id);
      if (!u) return c;
      return {
        ...c,
        availableBeds: u.resolvedBeds,
        safetyLevel: u.resolvedSafety,
        dangerLevel: Math.max(1, 11 - u.resolvedSafety),
        status: u.resolvedStatus,
        uncertaintyScore: u.uncertaintyPct,
        uncertaintyNotes: u.uncertaintyReason,
        lastUpdated: now,
        lastUpdatedBy: 'Cloud Gemini Reconciliation',
        version: c.version + 2,
        history: [
          ...c.history,
          {
            timestamp: now,
            availableBeds: u.resolvedBeds,
            safetyLevel: u.resolvedSafety,
            status: u.resolvedStatus,
            note: `Cloud conflict resolution (${u.confidenceLabel} confidence)`,
          },
        ],
      };
    });

    const newAlerts: EmergencyAlert[] = lastResolution.reconciledCamps
      .filter((u) => u.triggerEmergencyAlert)
      .map((u) => ({
        id: `alert-res-${u.campId}-${Date.now()}`,
        severity: 'CRITICAL' as const,
        title: `Cloud alert: ${u.campName} (${u.resolvedStatus.toLowerCase()})`,
        message: `${u.conflictSummary} Safety ${u.resolvedSafety}/10 (${u.uncertaintyPct}% uncertainty).`,
        campId: u.campId,
        timestamp: now,
        source: 'Cloud Gemini Reconciliation',
        acknowledged: false,
        propagatedViaMesh: true,
      }));

    const resolvedCampIds = new Set(lastResolution.reconciledCamps.map((u) => u.campId));
    const nextUncertainty: UncertaintyLogEntry[] = [
      ...lastResolution.reconciledCamps.map((u) => ({
        id: `unc-res-${u.campId}-${Date.now()}`,
        timestamp: now,
        campId: u.campId,
        campName: u.campName,
        uncertaintyPct: u.uncertaintyPct,
        reason: u.uncertaintyReason,
        sourcesInvolved: [
          'Cloud Gemini',
          'Field Reports',
          ...(cctvReadings.some((r) => r.campId === u.campId) ? ['CCTV Sensor'] : []),
        ],
        status: u.uncertaintyPct <= 35 ? ('RESOLVED' as const) : ('OPEN' as const),
        resolutionNote: u.conflictSummary,
      })),
      ...uncertaintyLogs.map((entry) =>
        entry.campId && resolvedCampIds.has(entry.campId) && entry.status === 'OPEN'
          ? {
              ...entry,
              status: 'RESOLVED' as const,
              resolutionNote: 'Superseded by Cloud Gemini reconciliation commit.',
            }
          : entry
      ),
    ];

    setCamps(nextCamps);
    setReports((prev) => prev.map((r) => ({ ...r, syncedToCloud: true, resolved: true })));
    setUncertaintyLogs(nextUncertainty);
    if (newAlerts.length > 0) {
      setAlerts((prev) => [...newAlerts, ...prev]);
    }
    setLastResolution(null);

    const syncRes = await syncStateToFirestore({
      camps: nextCamps,
      alerts: [...newAlerts, ...alerts],
      uncertaintyLogs: nextUncertainty,
    });

    transceiverRef.current?.broadcast({
      type: 'MESH_GOSSIP_SYNC',
      cycleSec: adaptiveCycle.cycleSec,
      camps: nextCamps,
      alerts: newAlerts,
    });

    showToast(
      syncRes.synced
        ? `Committed to Cloud Firestore (${syncRes.count} docs) and broadcast to field devices`
        : 'Committed to Base camp DB and broadcast to local mesh peers'
    );
  };

  const handleRunPatternForecast = async () => {
    const result = await detectPatternsAndForecastCloud({
      camps,
      hazards,
      uncertaintyLogs,
    });
    setLastForecast(result);
    recordTelemetry({
      taskType: 'PATTERN_FORECAST',
      requestedMode: InferenceMode.ONLY_IN_CLOUD,
      actualSource: result.inferenceSource,
      modelName: firebaseState.remoteParams.cloudModelName,
      latencyMs: result.latencyMs,
      multimodal: false,
    });
    showToast('Cloud pattern detection and shortage forecast complete');
  };

  const handleResetDemo = () => {
    clearLocalDatabase();
    setCamps(INITIAL_AID_CAMPS);
    setHazards(INITIAL_HAZARD_ZONES);
    setReports(INITIAL_FIELD_REPORTS);
    setAlerts(INITIAL_ALERTS);
    setUncertaintyLogs(INITIAL_UNCERTAINTY_LOGS);
    setSnapshot(null);
    setCctvReadings([]);
    setLastResolution(null);
    setLastForecast(null);
    setMessages(INITIAL_MESSAGES);
    showToast('Demo scenario reset to initial state');
  };

  const unsyncedCount = reports.filter((r) => !r.resolved).length;
  const onDeviceCalls = telemetry.filter((t) => t.actualSource === 'ON_DEVICE').length;
  const inCloudCalls = telemetry.filter((t) => t.actualSource === 'IN_CLOUD').length;

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink-primary">
      <TopCommandBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        operatingMode={operatingMode}
        onToggleMode={(mode) => {
          setOperatingMode(mode);
          showToast(
            mode === 'FIELD_OFFLINE'
              ? 'Switched to Field offline: AI locked to on-device Gemini Nano 4 and local mesh'
              : 'Switched to Base camp online: Cloud Gemini and Firestore sync enabled'
          );
        }}
        onDownloadFieldPack={handleDownloadFieldPack}
        downloadingPack={downloadingPack}
        nanoDownloadProgress={nanoDownloadProgress}
        snapshot={snapshot}
        unsyncedReportCount={unsyncedCount}
        onGoToCloudSync={() => {
          if (operatingMode === 'FIELD_OFFLINE') {
            setOperatingMode('BASE_CAMP_ONLINE');
          }
          setActiveTab('cloud');
        }}
        nanoStatus={nanoStatus}
        firebaseConfigured={firebaseState.configured}
        activeAlerts={alerts}
        onDismissAlert={(id) =>
          setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)))
        }
        onOpenDiagnostics={() => setDiagnosticsOpen(true)}
        onToggleDemoGuide={() => setDemoGuideOpen((v) => !v)}
        demoGuideOpen={demoGuideOpen}
      />

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-4 lg:px-6">
        <ClosedLoopBanner
          operatingMode={operatingMode}
          activeTab={activeTab}
          snapshot={snapshot}
          unsyncedReportCount={unsyncedCount}
          nanoStatus={nanoStatus}
          appCheckActive={firebaseState.appCheckActive}
          onDeviceCount={onDeviceCalls}
          inCloudCount={inCloudCalls}
          onSelectTab={setActiveTab}
          onDownloadFieldPack={handleDownloadFieldPack}
        />

        {activeTab === 'map' && (
          <TacticalMapView
            camps={camps}
            hazards={hazards}
            peers={peers}
            workerPos={workerPos}
            onMoveWorker={setWorkerPos}
            dangerWeight={dangerWeight}
            onChangeDangerWeight={setDangerWeight}
            operatingMode={operatingMode}
            onMarkCampDestroyed={handleMarkCampDestroyed}
            onAddHazardZone={handleAddHazardZone}
            onAskMapLocally={handleAskMapLocally}
            onOpenReportForCamp={(campId) => {
              setDefaultReportCampId(campId);
              setActiveTab('field');
            }}
          />
        )}

        {activeTab === 'field' && (
          <FieldAssistantView
            camps={camps}
            protocols={INITIAL_PROTOCOLS}
            operatingMode={operatingMode}
            snapshot={snapshot}
            messages={messages}
            onSendMessage={handleSendFieldMessage}
            onSubmitFieldReport={handleSubmitFieldReport}
            defaultReportCampId={defaultReportCampId}
          />
        )}

        {activeTab === 'mesh' && (
          <LocalMeshView
            deviceCallsign={deviceCallsign}
            peers={peers}
            syncEvents={syncEvents}
            adaptiveCycle={adaptiveCycle}
            secondsToNextCycle={secondsToNextCycle}
            operatingMode={operatingMode}
            camps={camps}
            onTriggerManualGossip={() => triggerMeshGossip(true)}
            onSimulateIncomingPeerReport={handleSimulateIncomingPeerReport}
          />
        )}

        {activeTab === 'cloud' && (
          <CloudCommandView
            operatingMode={operatingMode}
            onSwitchToOnline={() => setOperatingMode('BASE_CAMP_ONLINE')}
            camps={camps}
            pendingReports={reports}
            cctvReadings={cctvReadings}
            uncertaintyLogs={uncertaintyLogs}
            lastResolution={lastResolution}
            lastForecast={lastForecast}
            onAnalyzeCctv={handleAnalyzeCctv}
            onResolveConflicts={handleResolveConflicts}
            onCommitResolution={handleCommitResolution}
            onRunPatternForecast={handleRunPatternForecast}
          />
        )}
      </main>

      <FirebaseDiagnosticsModal
        open={diagnosticsOpen}
        onClose={() => setDiagnosticsOpen(false)}
        firebaseState={firebaseState}
        nanoStatus={nanoStatus}
        telemetry={telemetry}
        onRefreshNano={refreshNano}
        onReinitFirebase={bootstrapFirebase}
        onResetDemoData={handleResetDemo}
      />

      <DemoWalkthroughDrawer
        open={demoGuideOpen}
        onClose={() => setDemoGuideOpen(false)}
        onSelectTab={setActiveTab}
        onSetMode={setOperatingMode}
        onDownloadPack={handleDownloadFieldPack}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex max-w-md items-center gap-3 rounded-lg border border-control bg-surface px-4 py-3 text-xs font-medium text-ink-primary shadow-overlay"
        >
          <span className="leading-snug">{toast.message}</span>
          {toast.actionLabel && toast.onAction && (
            <button
              onClick={toast.onAction}
              className="btn-secondary shrink-0 rounded-md px-2.5 py-1 text-xs font-medium text-ink-primary"
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
