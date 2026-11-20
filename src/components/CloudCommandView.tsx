import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Cloud,
  CloudOff,
  Eye,
  GitMerge,
  LineChart,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  Upload,
} from 'lucide-react';
import {
  AidCamp,
  CctvBedAnalysisResult,
  ConflictResolutionResult,
  FieldReport,
  OperatingMode,
  ShortageForecastResult,
  UncertaintyLogEntry,
} from '../types/crisis';
import {
  generateCctvImageDataUrl,
  SAMPLE_CCTV_PRESETS,
  SampleCctvPreset,
} from '../utils/cctvGenerator';
import { InferenceBadge } from './InferenceBadge';
import { CameraCaptureModal } from './CameraCaptureModal';

interface CloudCommandViewProps {
  operatingMode: OperatingMode;
  onSwitchToOnline: () => void;
  camps: AidCamp[];
  pendingReports: FieldReport[];
  cctvReadings: CctvBedAnalysisResult[];
  uncertaintyLogs: UncertaintyLogEntry[];
  lastResolution: ConflictResolutionResult | null;
  lastForecast: ShortageForecastResult | null;
  onAnalyzeCctv: (params: {
    campId: string;
    imageDataUrl: string;
    presetHint?: SampleCctvPreset;
  }) => Promise<void>;
  onResolveConflicts: () => Promise<void>;
  onCommitResolution: () => Promise<void>;
  onRunPatternForecast: () => Promise<void>;
}

export const CloudCommandView: React.FC<CloudCommandViewProps> = ({
  operatingMode,
  onSwitchToOnline,
  camps,
  pendingReports,
  cctvReadings,
  uncertaintyLogs,
  lastResolution,
  lastForecast,
  onAnalyzeCctv,
  onResolveConflicts,
  onCommitResolution,
  onRunPatternForecast,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(SAMPLE_CCTV_PRESETS[0].id);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [customCampId, setCustomCampId] = useState<string>('camp-east');
  const [generatedPreview, setGeneratedPreview] = useState<string>('');
  const [analyzingCctv, setAnalyzingCctv] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [forecasting, setForecasting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedPreset =
    SAMPLE_CCTV_PRESETS.find((p) => p.id === selectedPresetId) ?? SAMPLE_CCTV_PRESETS[0];

  useEffect(() => {
    setGeneratedPreview(generateCctvImageDataUrl(selectedPreset));
  }, [selectedPreset]);

  const isOffline = operatingMode === 'FIELD_OFFLINE';

  const handleUploadCustomImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRunCctv = async () => {
    const img = customImage || generatedPreview;
    if (!img || analyzingCctv) return;
    setAnalyzingCctv(true);
    try {
      await onAnalyzeCctv({
        campId: customImage ? customCampId : selectedPreset.campId,
        imageDataUrl: img,
        presetHint: customImage ? undefined : selectedPreset,
      });
    } finally {
      setAnalyzingCctv(false);
    }
  };

  const handleRunResolve = async () => {
    if (resolving) return;
    setResolving(true);
    try {
      await onResolveConflicts();
    } finally {
      setResolving(false);
    }
  };

  const handleCommit = async () => {
    if (committing) return;
    setCommitting(true);
    try {
      await onCommitResolution();
    } finally {
      setCommitting(false);
    }
  };

  const handleRunForecast = async () => {
    if (forecasting) return;
    setForecasting(true);
    try {
      await onRunPatternForecast();
    } finally {
      setForecasting(false);
    }
  };

  const unresolvedReports = pendingReports.filter((r) => !r.resolved);

  return (
    <div className="space-y-4">
      {/* Offline Guard Banner */}
      {isOffline && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-950/35 px-4 py-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-200">
            <CloudOff className="h-5 w-5 text-amber-400" />
            <div>
              <strong className="text-amber-100">
                Device is currently in IN-FIELD OFFLINE mode.
              </strong>{' '}
              Return to Base Camp (Online) to upload your {unresolvedReports.length} queued field
              report(s) and execute Cloud Gemini Conflict Resolution, CCTV Bed Counting & Shortage
              Forecasting.
            </div>
          </div>
          <button
            onClick={onSwitchToOnline}
            className="rounded-xl bg-emerald-600 px-3.5 py-2 font-bold text-white transition hover:bg-emerald-500"
          >
            Reconnect to Base Camp Cloud
          </button>
        </div>
      )}

      {/* Top Row: CCTV Sensory Bed Counter + Conflict Resolution Engine */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Panel 1: Multimodal Sensory CCTV Bed Counter */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/85 p-4 xl:col-span-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                <Camera className="h-4 w-4 text-cyan-400" />
                Sensory Input: Cloud CCTV / Ward Photo Bed Counter
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Firebase AI Logic <code className="text-violet-300">ONLY_IN_CLOUD</code> multimodal
                vision counts beds, detects structural damage & quantifies visual uncertainty.
              </p>
            </div>
            <span className="rounded bg-violet-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-violet-300">
              MULTIMODAL
            </span>
          </div>

          {/* Preset selector + Upload real photo */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedPresetId}
              onChange={(e) => {
                setCustomImage(null);
                setSelectedPresetId(e.target.value);
              }}
              className="flex-1 min-w-[200px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            >
              {SAMPLE_CCTV_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadCustomImage}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-500/50"
            >
              <Upload className="h-3.5 w-3.5 text-cyan-400" />
              <span>Upload Photo</span>
            </button>
            <button
              onClick={() => setCameraOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-500/50"
            >
              <Camera className="h-3.5 w-3.5 text-emerald-400" />
              <span>Live Cam</span>
            </button>
          </div>

          {customImage && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Assign photo to camp:</span>
              <select
                value={customCampId}
                onChange={(e) => setCustomCampId(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"
              >
                {camps.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Image Preview */}
          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-black">
            {(customImage || generatedPreview) && (
              <img
                src={customImage || generatedPreview}
                alt="Ward CCTV Feed"
                className="h-[225px] w-full object-contain"
              />
            )}
          </div>

          <button
            onClick={handleRunCctv}
            disabled={analyzingCctv || isOffline}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-950/40 transition hover:brightness-110 disabled:opacity-50"
          >
            <Eye className="h-4 w-4" />
            <span>
              {analyzingCctv
                ? 'Analyzing CCTV Feed via Cloud Gemini...'
                : 'Count Beds & Assess Hazards with Cloud Gemini'}
            </span>
          </button>

          {/* Latest CCTV Readings */}
          {cctvReadings.length > 0 && (
            <div className="space-y-2">
              {cctvReadings.slice(0, 2).map((reading, i) => {
                const camp = camps.find((c) => c.id === reading.campId);
                return (
                  <div
                    key={`${reading.campId}-${i}`}
                    className="rounded-xl border border-cyan-500/30 bg-slate-950/90 p-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-white">
                        {camp?.name ?? reading.campId} · Sensory Output
                      </span>
                      <InferenceBadge
                        source={reading.inferenceSource}
                        latencyMs={reading.latencyMs}
                        compact
                      />
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-2 text-center font-mono text-[11px]">
                      <div className="rounded-lg bg-slate-900 p-1.5">
                        <div className="text-[9.5px] text-slate-400">Open Beds</div>
                        <div className="font-bold text-emerald-300">{reading.availableBeds}</div>
                      </div>
                      <div className="rounded-lg bg-slate-900 p-1.5">
                        <div className="text-[9.5px] text-slate-400">Occupied</div>
                        <div className="font-bold text-amber-300">{reading.occupiedBeds}</div>
                      </div>
                      <div className="rounded-lg bg-slate-900 p-1.5">
                        <div className="text-[9.5px] text-slate-400">Status</div>
                        <div className="font-bold text-cyan-300">{reading.structuralStatus}</div>
                      </div>
                      <div className="rounded-lg bg-slate-900 p-1.5">
                        <div className="text-[9.5px] text-slate-400">Uncertainty</div>
                        <div className="font-bold text-red-300">{reading.uncertaintyPct}%</div>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-300">{reading.visualEvidence}</p>
                    <div className="mt-1 text-[10px] text-amber-300/90">
                      Uncertainty Factors: {reading.uncertaintyFactors.join(' · ')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel 2: Multi-Source Conflict Resolution Workbench */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/85 p-4 xl:col-span-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                <GitMerge className="h-4 w-4 text-violet-400" />
                Cloud AI Conflict Resolution & Uncertainty Reconciliation
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Synthesizes previous DB state + {unresolvedReports.length} uploaded field/mesh
                report(s) + {cctvReadings.length} CCTV reading(s).
              </p>
            </div>
            <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
              {unresolvedReports.length} QUEUED
            </span>
          </div>

          {/* Pending Field Reports Queue */}
          <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
            {unresolvedReports.length === 0 ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-center text-xs text-emerald-300">
                <CheckCircle2 className="mx-auto mb-1 h-5 w-5" />
                All uploaded field reports are reconciled with Cloud Firestore!
              </div>
            ) : (
              unresolvedReports.map((rep) => {
                const currentCamp = camps.find((c) => c.id === rep.campId);
                const bedConflict =
                  currentCamp && Math.abs(currentCamp.availableBeds - rep.reportedBeds) >= 3;
                return (
                  <div
                    key={rep.id}
                    className={`rounded-xl border p-2.5 text-xs ${
                      bedConflict
                        ? 'border-amber-500/40 bg-amber-950/20'
                        : 'border-slate-800 bg-slate-950/75'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="font-bold text-white">
                        {rep.campName}{' '}
                        <span className="font-mono text-[10px] text-cyan-400">
                          ({rep.workerName})
                        </span>
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        {bedConflict && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-bold text-amber-300">
                            CONFLICT: DB {currentCamp?.availableBeds} vs {rep.reportedBeds} beds
                          </span>
                        )}
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">
                          {rep.reportedStatus}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">{rep.notes}</p>
                    <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-slate-500">
                      <span>
                        Reported: {rep.reportedBeds} beds · Safety {rep.reportedSafety}/10
                      </span>
                      <span>{new Date(rep.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <button
            onClick={handleRunResolve}
            disabled={
              resolving || isOffline || (unresolvedReports.length === 0 && cctvReadings.length === 0)
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            <span>
              {resolving
                ? 'Reconciling Conflicts with Cloud Gemini...'
                : 'Resolve Conflicts & Log Uncertainty with Cloud Gemini'}
            </span>
          </button>

          {/* Proposed Reconciliation Output */}
          {lastResolution && (
            <div className="space-y-2.5 rounded-xl border border-violet-500/40 bg-slate-950/90 p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-violet-300">Reconciled Ground Truth Ready</span>
                <InferenceBadge
                  source={lastResolution.inferenceSource}
                  latencyMs={lastResolution.latencyMs}
                  compact
                />
              </div>
              <p className="text-[11px] text-slate-300">{lastResolution.summary}</p>

              <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
                {lastResolution.reconciledCamps.map((u) => (
                  <div
                    key={u.campId}
                    className="rounded-lg border border-slate-800 bg-slate-900/90 p-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="font-bold text-white">{u.campName}</span>
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <span className="text-slate-400">
                          Beds: {u.previousBeds} →{' '}
                          <strong className="text-emerald-300">{u.resolvedBeds}</strong>
                        </span>
                        <span className="text-slate-400">
                          Safe: {u.previousSafety} →{' '}
                          <strong className="text-cyan-300">{u.resolvedSafety}/10</strong>
                        </span>
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-300">
                          Unc {u.uncertaintyPct}%
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">{u.conflictSummary}</p>
                    <p className="mt-1 text-[10px] text-amber-200/80">
                      Logged Uncertainty: {u.uncertaintyReason}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleCommit}
                disabled={committing || isOffline}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {committing
                    ? 'Committing to Firestore...'
                    : 'Commit Reconciled Truth to Cloud DB & Broadcast to Field'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Long-Context Pattern Detection & Shortage Forecasting + Uncertainty Ledger */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Panel 3: Pattern Detection & Shortage Prediction */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 xl:col-span-7">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                <LineChart className="h-4 w-4 text-emerald-400" />
                Cloud Pattern Detection & Resource Shortage Forecasting
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Long-context reasoning across full camp Data History to predict shortages & organize bases.
              </p>
            </div>
            <button
              onClick={handleRunForecast}
              disabled={forecasting || isOffline}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50"
            >
              <Cloud className="h-3.5 w-3.5" />
              <span>{forecasting ? 'Analyzing History...' : 'Run Cloud Forecast'}</span>
            </button>
          </div>

          {lastForecast ? (
            <div className="space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                <p className="flex-1 text-slate-200">{lastForecast.executiveSummary}</p>
                <InferenceBadge
                  source={lastForecast.inferenceSource}
                  latencyMs={lastForecast.latencyMs}
                  compact
                />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {lastForecast.predictions.map((pred, idx) => (
                  <div
                    key={`${pred.campId}-${idx}`}
                    className={`rounded-xl border p-3 ${
                      pred.riskLevel === 'CRITICAL'
                        ? 'border-red-500/40 bg-red-950/25'
                        : pred.riskLevel === 'HIGH'
                          ? 'border-amber-500/40 bg-amber-950/20'
                          : 'border-slate-800 bg-slate-950/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white">{pred.campName}</span>
                      <span className="flex items-center gap-1 rounded bg-black/40 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                        <TrendingDown className="h-3 w-3 text-red-400" />
                        ~{pred.hoursUntilDepletion}h left
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] font-semibold text-cyan-300">
                      {pred.resource} ({pred.riskLevel})
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">{pred.explanation}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-300">
                    Detected Systemic Patterns
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-300">
                    {lastForecast.systemicPatterns.map((p, i) => (
                      <li key={i}>• {p}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-3">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                    Base Reorganization Plan
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-emerald-100/90">
                    {lastForecast.baseReorganizationPlan.map((step, i) => (
                      <li key={i}>
                        <strong>{i + 1}.</strong> {step}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-6 text-center text-xs text-slate-400">
              Click <strong className="text-emerald-300">&quot;Run Cloud Forecast&quot;</strong> to feed
              full multi-hour camp history into Cloud Gemini for shortage countdowns, overflow
              cascade detection, and base camp reorganization recommendations.
            </div>
          )}
        </div>

        {/* Panel 4: Logged Uncertainty Audit Ledger */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 xl:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              Logged Uncertainty Audit Trail
            </h2>
            <span className="font-mono text-[10px] text-slate-400">
              {uncertaintyLogs.filter((u) => u.status === 'OPEN').length} open
            </span>
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {uncertaintyLogs.map((entry) => (
              <div
                key={entry.id}
                className={`rounded-xl border p-3 text-xs ${
                  entry.status === 'OPEN'
                    ? 'border-amber-500/30 bg-amber-950/15'
                    : 'border-slate-800 bg-slate-950/70'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-bold text-white">
                    {entry.status === 'OPEN' ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                    {entry.campName || 'Sector Telemetry'}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                      entry.uncertaintyPct >= 50
                        ? 'bg-red-500/20 text-red-300'
                        : entry.uncertaintyPct >= 25
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {entry.uncertaintyPct}% UNCERTAINTY · {entry.status}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-300">{entry.reason}</p>
                {entry.resolutionNote && (
                  <p className="mt-1 text-[10.5px] text-emerald-300">
                    ✓ Resolved: {entry.resolutionNote}
                  </p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 font-mono text-[9.5px] text-slate-500">
                  <span>Sources: {entry.sourcesInvolved.join(', ')}</span>
                  <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <CameraCaptureModal
        open={cameraOpen}
        title="Capture Live Ward / Field Photo for Cloud Bed Counter"
        onClose={() => setCameraOpen(false)}
        onCapture={(dataUrl) => setCustomImage(dataUrl)}
      />
    </div>
  );
};
