import React, { useEffect, useRef, useState } from 'react';
import {
  CameraIcon,
  CheckCircleIcon,
  CloudIcon,
  CloudOffIcon,
  EyeIcon,
  GitMergeIcon,
  TrendingDownIcon,
  UploadIcon,
  XIcon,
} from './icons';
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
import { UncertaintyMeter } from './UncertaintyMeter';

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
  const [cloudError, setCloudError] = useState<string | null>(null);

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
    setCloudError(null);
    setAnalyzingCctv(true);
    try {
      await onAnalyzeCctv({
        campId: customImage ? customCampId : selectedPreset.campId,
        imageDataUrl: img,
        presetHint: customImage ? undefined : selectedPreset,
      });
    } catch (err) {
      setCloudError(
        err instanceof Error
          ? `CCTV bed count failed: ${err.message}`
          : 'CCTV bed count failed. Verify connectivity and retry.'
      );
    } finally {
      setAnalyzingCctv(false);
    }
  };

  const handleRunResolve = async () => {
    if (resolving) return;
    setCloudError(null);
    setResolving(true);
    try {
      await onResolveConflicts();
    } catch (err) {
      setCloudError(
        err instanceof Error
          ? `Conflict reconciliation failed: ${err.message}`
          : 'Conflict reconciliation failed. Retry when online.'
      );
    } finally {
      setResolving(false);
    }
  };

  const handleCommit = async () => {
    if (committing) return;
    setCloudError(null);
    setCommitting(true);
    try {
      await onCommitResolution();
    } catch (err) {
      setCloudError(
        err instanceof Error
          ? `Commit failed: ${err.message}`
          : 'Unable to commit reconciled records. Retry when online.'
      );
    } finally {
      setCommitting(false);
    }
  };

  const handleRunForecast = async () => {
    if (forecasting) return;
    setCloudError(null);
    setForecasting(true);
    try {
      await onRunPatternForecast();
    } catch (err) {
      setCloudError(
        err instanceof Error
          ? `Forecast failed: ${err.message}`
          : 'Cloud forecast failed. Retry when online.'
      );
    } finally {
      setForecasting(false);
    }
  };

  const unresolvedReports = pendingReports.filter((r) => !r.resolved);

  return (
    <div className="space-y-4">
      {/* Offline Guard Bar */}
      {isOffline && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-caution/30 bg-caution-dim/60 px-4 py-3 text-xs">
          <div className="flex items-center gap-2.5 text-ink-primary">
            <CloudOffIcon size={16} className="shrink-0 text-caution" />
            <span>
              Device is in Field offline mode. Reconnect to Base camp to upload{' '}
              <span className="tabular font-mono">{unresolvedReports.length}</span> queued field
              report(s) and run Cloud Gemini reconciliation.
            </span>
          </div>
          <button
            onClick={onSwitchToOnline}
            className="btn-primary h-9 rounded-lg px-3.5 text-xs font-medium sm:h-8"
          >
            Reconnect to Base camp
          </button>
        </div>
      )}

      {/* Inline Cloud Error Banner */}
      {cloudError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-hazard/35 bg-hazard-dim/70 px-4 py-3 text-xs text-ink-primary"
        >
          <span>{cloudError}</span>
          <button
            onClick={() => setCloudError(null)}
            aria-label="Dismiss error"
            className="rounded p-1 text-ink-secondary hover:bg-ink-primary/10 hover:text-ink-primary"
          >
            <XIcon size={14} />
          </button>
        </div>
      )}

      {/* Top Row: Ward CCTV Monitor + Conflict Reconciliation Diff */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Panel 1: Ward CCTV / Photo Bed Counter */}
        <section className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface p-4 xl:col-span-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-ink-primary">Ward CCTV bed counter</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Firebase AI Logic <code className="font-mono text-ink-secondary">ONLY_IN_CLOUD</code>{' '}
                vision counts open cots, structural damage, and visual uncertainty
              </p>
            </div>
            <span className="shrink-0 font-mono text-[11px] text-ink-muted">Multimodal</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Select ward CCTV feed"
              value={selectedPresetId}
              onChange={(e) => {
                setCustomImage(null);
                setSelectedPresetId(e.target.value);
              }}
              className="h-10 min-w-[200px] flex-1 rounded-lg border border-control bg-recessed px-3 text-base text-ink-primary sm:h-9 sm:text-xs"
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
              className="btn-secondary flex h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-medium sm:h-9"
            >
              <UploadIcon size={14} className="text-ink-muted" />
              <span>Upload</span>
            </button>
            <button
              onClick={() => setCameraOpen(true)}
              className="btn-secondary flex h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-medium sm:h-9"
            >
              <CameraIcon size={14} className="text-ink-muted" />
              <span>Live cam</span>
            </button>
          </div>

          {customImage && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-ink-secondary">Assign photo to camp</span>
              <select
                value={customCampId}
                onChange={(e) => setCustomCampId(e.target.value)}
                className="h-9 rounded-md border border-control bg-recessed px-2 text-base text-ink-primary sm:h-8 sm:text-xs"
              >
                {camps.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}: {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Monitor Viewport */}
          <div className="relative overflow-hidden rounded-lg border border-control bg-[#0c0d0c]">
            {(customImage || generatedPreview) && (
              <img
                src={customImage || generatedPreview}
                alt={`Ward CCTV feed for ${selectedPreset.label}`}
                className="aspect-[720/420] w-full object-contain sm:h-[232px] sm:aspect-auto"
              />
            )}
          </div>

          <button
            onClick={handleRunCctv}
            disabled={analyzingCctv || isOffline}
            className="btn-primary mt-auto flex h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-medium disabled:opacity-50 sm:h-9"
          >
            <EyeIcon size={14} />
            <span>
              {analyzingCctv ? 'Analyzing CCTV feed...' : 'Count beds and assess hazards'}
            </span>
          </button>

          {cctvReadings.length > 0 && (
            <div className="space-y-3">
              {cctvReadings.slice(0, 2).map((reading, i) => {
                const camp = camps.find((c) => c.id === reading.campId);
                return (
                  <div
                    key={`${reading.campId}-${i}`}
                    className="rounded-lg border border-hairline bg-recessed p-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-ink-primary">
                        {camp?.name ?? reading.campId}
                      </span>
                      <InferenceBadge
                        source={reading.inferenceSource}
                        latencyMs={reading.latencyMs}
                        compact
                      />
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 divide-x divide-hairline rounded-md border border-hairline bg-surface sm:grid-cols-4">
                      <div className="px-2.5 py-2">
                        <div className="text-[11px] text-ink-muted">Open</div>
                        <div className="tabular mt-0.5 font-mono text-sm font-medium text-safe">
                          {reading.availableBeds}
                        </div>
                      </div>
                      <div className="px-2.5 py-2">
                        <div className="text-[11px] text-ink-muted">Occupied</div>
                        <div className="tabular mt-0.5 font-mono text-sm font-medium text-ink-primary">
                          {reading.occupiedBeds}
                        </div>
                      </div>
                      <div className="px-2.5 py-2">
                        <div className="text-[11px] text-ink-muted">Status</div>
                        <div className="mt-0.5 text-xs font-medium text-ink-primary">
                          {reading.structuralStatus.charAt(0) +
                            reading.structuralStatus.slice(1).toLowerCase()}
                        </div>
                      </div>
                      <div className="px-2.5 py-2">
                        <div className="text-[11px] text-ink-muted">Uncertainty</div>
                        <div className="mt-1">
                          <UncertaintyMeter value={reading.uncertaintyPct} compact />
                        </div>
                      </div>
                    </div>
                    <p className="mt-2.5 leading-relaxed text-ink-secondary">
                      {reading.visualEvidence}
                    </p>
                    <div className="mt-1 text-[11px] text-ink-muted">
                      Factors: {reading.uncertaintyFactors.join(' · ')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Panel 2: Conflict Resolution Workbench */}
        <section className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface p-4 xl:col-span-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-ink-primary">
                Cloud conflict reconciliation
              </h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Synthesizes prior DB state with{' '}
                <span className="tabular font-mono text-ink-secondary">
                  {unresolvedReports.length}
                </span>{' '}
                field report(s) and{' '}
                <span className="tabular font-mono text-ink-secondary">{cctvReadings.length}</span>{' '}
                CCTV reading(s)
              </p>
            </div>
            <span className="tabular shrink-0 font-mono text-[11px] text-caution">
              {unresolvedReports.length} queued
            </span>
          </div>

          <div className="max-h-[296px] flex-1 overflow-y-auto rounded-lg border border-hairline bg-recessed">
            {unresolvedReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1.5 p-6 text-center text-xs text-ink-secondary">
                <CheckCircleIcon size={18} className="text-safe" />
                <span>All field reports reconciled with Cloud Firestore</span>
              </div>
            ) : (
              <div className="divide-y divide-hairline">
                {unresolvedReports.map((rep) => {
                  const currentCamp = camps.find((c) => c.id === rep.campId);
                  const bedConflict =
                    currentCamp && Math.abs(currentCamp.availableBeds - rep.reportedBeds) >= 3;
                  return (
                    <div key={rep.id} className="p-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              bedConflict ? 'bg-caution' : 'bg-ink-muted'
                            }`}
                          />
                          <span className="font-medium text-ink-primary">{rep.campName}</span>
                          <span className="font-mono text-[11px] text-ink-muted">
                            {rep.workerName}
                          </span>
                        </div>
                        {bedConflict && (
                          <span className="tabular font-mono text-[11px] text-caution">
                            DB {currentCamp?.availableBeds} vs report {rep.reportedBeds} beds
                          </span>
                        )}
                      </div>
                      <p className="mt-1 pl-3.5 leading-relaxed text-ink-secondary">{rep.notes}</p>
                      <div className="mt-1.5 flex items-center justify-between pl-3.5 font-mono text-[11px] text-ink-muted">
                        <span className="tabular">
                          {rep.reportedBeds} beds · Safety {rep.reportedSafety}/10 ·{' '}
                          {rep.reportedStatus.charAt(0) + rep.reportedStatus.slice(1).toLowerCase()}
                        </span>
                        <span className="tabular">
                          {new Date(rep.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={handleRunResolve}
            disabled={
              resolving ||
              isOffline ||
              (unresolvedReports.length === 0 && cctvReadings.length === 0)
            }
            className="btn-primary mt-auto flex h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-medium disabled:opacity-50 sm:h-9"
          >
            <GitMergeIcon size={14} />
            <span>
              {resolving ? 'Reconciling conflicts...' : 'Reconcile conflicts with Cloud Gemini'}
            </span>
          </button>

          {lastResolution && (
            <div className="space-y-3 rounded-lg border border-control bg-recessed p-3.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-ink-primary">Reconciled ground truth</span>
                <InferenceBadge
                  source={lastResolution.inferenceSource}
                  latencyMs={lastResolution.latencyMs}
                  compact
                />
              </div>
              <p className="leading-relaxed text-ink-secondary">{lastResolution.summary}</p>

              <div className="max-h-[220px] divide-y divide-hairline overflow-y-auto rounded-md border border-hairline bg-surface">
                {lastResolution.reconciledCamps.map((u) => (
                  <div key={u.campId} className="p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-ink-primary">{u.campName}</span>
                      <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                        <span className="tabular text-ink-muted">
                          Beds {u.previousBeds} →{' '}
                          <span className="text-safe">{u.resolvedBeds}</span>
                        </span>
                        <span className="tabular text-ink-muted">
                          Safety {u.previousSafety} →{' '}
                          <span className="text-ink-primary">{u.resolvedSafety}/10</span>
                        </span>
                        <UncertaintyMeter value={u.uncertaintyPct} compact />
                      </div>
                    </div>
                    <p className="mt-1.5 leading-relaxed text-ink-secondary">{u.conflictSummary}</p>
                    <p className="mt-1 text-[11px] text-ink-muted">
                      Logged uncertainty: {u.uncertaintyReason}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleCommit}
                disabled={committing || isOffline}
                className="btn-primary flex h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-medium disabled:opacity-50 sm:h-9"
              >
                <CheckCircleIcon size={14} />
                <span>
                  {committing
                    ? 'Committing to Firestore...'
                    : 'Commit reconciled truth and broadcast'}
                </span>
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Bottom Row: Shortage Forecast + Uncertainty Audit Ledger */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <section className="rounded-xl border border-hairline bg-surface p-4 xl:col-span-7">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink-primary">
                Pattern detection and shortage forecast
              </h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Long-context analysis over multi-hour camp history to predict depletion and reallocate resources
              </p>
            </div>
            <button
              onClick={handleRunForecast}
              disabled={forecasting || isOffline}
              className="btn-secondary flex h-10 items-center gap-1.5 rounded-lg px-3.5 text-xs font-medium disabled:opacity-50 sm:h-9"
            >
              <CloudIcon size={14} className="text-ink-muted" />
              <span>{forecasting ? 'Analyzing history...' : 'Run cloud forecast'}</span>
            </button>
          </div>

          {lastForecast ? (
            <div className="space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline bg-recessed p-3">
                <p className="flex-1 leading-relaxed text-ink-primary">
                  {lastForecast.executiveSummary}
                </p>
                <InferenceBadge
                  source={lastForecast.inferenceSource}
                  latencyMs={lastForecast.latencyMs}
                  compact
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {lastForecast.predictions.map((pred, idx) => (
                  <div
                    key={`${pred.campId}-${idx}`}
                    className="rounded-lg border border-hairline bg-recessed p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-ink-primary">{pred.campName}</span>
                      <span
                        className={`tabular inline-flex items-center gap-1 font-mono text-[11px] font-medium ${
                          pred.riskLevel === 'CRITICAL'
                            ? 'text-hazard'
                            : pred.riskLevel === 'HIGH'
                              ? 'text-caution'
                              : 'text-ink-secondary'
                        }`}
                      >
                        <TrendingDownIcon size={12} />
                        ~{pred.hoursUntilDepletion} h left
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-ink-secondary">{pred.resource}</div>
                    <p className="mt-1.5 leading-relaxed text-ink-muted">{pred.explanation}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-hairline bg-recessed p-3">
                  <div className="mb-2 text-xs font-medium text-ink-primary">Systemic patterns</div>
                  <ul className="space-y-1.5 leading-relaxed text-ink-secondary">
                    {lastForecast.systemicPatterns.map((p, i) => (
                      <li key={i}>• {p}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-hairline bg-recessed p-3">
                  <div className="mb-2 text-xs font-medium text-ink-primary">
                    Base reorganization plan
                  </div>
                  <ol className="list-decimal space-y-1.5 pl-4 leading-relaxed text-ink-secondary">
                    {lastForecast.baseReorganizationPlan.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-control bg-recessed p-6 text-center text-xs text-ink-secondary">
              Run Cloud forecast to analyze camp history for depletion countdowns, overflow cascades, and reallocation steps.
            </div>
          )}
        </section>

        <section className="rounded-xl border border-hairline bg-surface p-4 xl:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-primary">Uncertainty audit trail</h2>
            <span className="tabular font-mono text-[11px] text-ink-muted">
              {uncertaintyLogs.filter((u) => u.status === 'OPEN').length} open
            </span>
          </div>

          <div className="max-h-[360px] divide-y divide-hairline overflow-y-auto rounded-lg border border-hairline bg-recessed">
            {uncertaintyLogs.map((entry) => (
              <div key={entry.id} className="p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 font-medium text-ink-primary">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        entry.status === 'OPEN' ? 'bg-caution' : 'bg-safe'
                      }`}
                    />
                    {entry.campName || 'Sector telemetry'}
                  </span>
                  <div className="flex items-center gap-2">
                    <UncertaintyMeter value={entry.uncertaintyPct} compact />
                    <span className="text-[11px] text-ink-muted">
                      {entry.status === 'OPEN' ? 'Open' : 'Resolved'}
                    </span>
                  </div>
                </div>
                <p className="mt-1.5 pl-3.5 leading-relaxed text-ink-secondary">{entry.reason}</p>
                {entry.resolutionNote && (
                  <p className="mt-1 pl-3.5 text-[11px] text-safe">
                    Resolved: {entry.resolutionNote}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-1 pl-3.5 font-mono text-[11px] text-ink-muted">
                  <span>{entry.sourcesInvolved.join(', ')}</span>
                  <span className="tabular">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <CameraCaptureModal
        open={cameraOpen}
        title="Ward camera capture"
        onClose={() => setCameraOpen(false)}
        onCapture={(dataUrl) => setCustomImage(dataUrl)}
      />
    </div>
  );
};
